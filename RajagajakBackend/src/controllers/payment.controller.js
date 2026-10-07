const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const env = require("../config/env");
const Order = require("../models/Order.model");
const Product = require("../models/Product.model");
const Coupon = require("../models/Coupon.model");
const CouponRedemption = require("../models/CouponRedemption.model");
const asyncHandler = require("../utils/asyncHandler");
const { errorResponse, successResponse } = require("../utils/response");
const { calculateItems, buildPricing } = require("./order.controller");
const { calculateDelivery } = require("../services/shipping.service");
const { evaluateCoupon } = require("../services/coupon.service");

const paymentClient =
  env.razorpayKeyId && env.razorpayKeySecret
    ? new Razorpay({
        key_id: env.razorpayKeyId,
        key_secret: env.razorpayKeySecret,
      })
    : null;

const round = (value) => Number(value.toFixed(2));

const getPaymentConfig = (req, res) => {
  return res.json({ keyId: env.razorpayKeyId || null });
};

const normalizeAddress = (address = {}) => ({
  name: String(address.name || "").trim(),
  mobile: String(address.mobile || "").trim(),
  address: String(address.address || address.houseShop || "").trim(),
  fullAddress: String(address.fullAddress || "").trim(),
  building: String(address.building || "").trim(),
  houseNumber: String(address.houseNumber || "").trim(),
  road: String(address.road || "").trim(),
  locality: String(address.locality || "").trim(),
  district: String(address.district || "").trim(),
  area: String(address.area || "").trim(),
  city: String(address.city || "").trim(),
  state: String(address.state || "").trim(),
  pincode: String(address.pincode || address.pinCode || "").trim(),
  country: String(address.country || "").trim(),
  locationDetected: Boolean(address.locationDetected),
  locationSource: address.locationSource === "gps" ? "gps" : "manual",
});

const deliveryErrorMessage = (error) => {
  if (error.message === "We couldn't find that delivery address.")
    return error.message;
  if (error.message === "A complete delivery address is required.")
    return "Please enter a valid delivery address.";
  if (
    error.message ===
    "We couldn't get a readable address for your current location."
  )
    return error.message;
  return "We couldn't calculate delivery charges. Please try again or enter your delivery address.";
};

const getOrderNumber = () =>
  `RJG-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

const buildPaymentOrder = async ({
  userId,
  items,
  shippingAddress,
  customerLocation,
  couponCode,
}) => {
  const billingAddress = normalizeAddress(shippingAddress);
  const hasCustomerLocation = Boolean(customerLocation);
  if (
    !billingAddress.name ||
    !/^[6-9]\d{9}$/.test(billingAddress.mobile) ||
    (!hasCustomerLocation &&
      (!billingAddress.address ||
        !billingAddress.city ||
        !billingAddress.state ||
        !/^\d{6}$/.test(billingAddress.pincode)))
  ) {
    throw new Error("Please provide a complete valid delivery address.");
  }

  let shipping;
  try {
    shipping = await calculateDelivery({
      customerLocation,
      shippingAddress: billingAddress,
    });
    if (hasCustomerLocation) {
      const location = shipping.location || {};
      Object.assign(billingAddress, {
        address: shipping.fullAddress,
        fullAddress: shipping.fullAddress,
        building: location.building || "",
        houseNumber: location.houseNumber || "",
        road: location.road || "",
        locality: location.locality || "",
        district: location.district || "",
        area: location.area || "",
        city: location.city || "",
        state: location.state || "",
        pincode: location.pincode || "",
        country: location.country || "",
        locationDetected: true,
        locationSource: "gps",
      });
    } else {
      billingAddress.fullAddress = [
        billingAddress.address,
        billingAddress.area,
        billingAddress.city,
        [billingAddress.state, billingAddress.pincode]
          .filter(Boolean)
          .join(" - "),
      ]
        .filter(Boolean)
        .join(", ");
      billingAddress.locationDetected = false;
      billingAddress.locationSource = "manual";
    }
    billingAddress.latitude = shipping.destination.latitude;
    billingAddress.longitude = shipping.destination.longitude;
  } catch (error) {
    throw new Error(deliveryErrorMessage(error));
  }

  const calculatedItems = await calculateItems(items);
  const baseSnapshots = calculatedItems.map((item) => item.snapshot);
  let snapshots = baseSnapshots;
  let pricing = buildPricing(snapshots, shipping.shippingCharge);
  let appliedCoupon = null;

  if (couponCode) {
    const normalizedCouponCode = String(couponCode).trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: normalizedCouponCode });
    if (!coupon) throw new Error("Coupon not found.");
    const [userOrderCount, redemption] = await Promise.all([
      Order.countDocuments({
        userId,
        orderStatus: { $ne: "cancelled" },
      }),
      CouponRedemption.findOne({ couponId: coupon._id, userId }),
    ]);
    const couponResult = evaluateCoupon({
      coupon,
      items: snapshots,
      shipping,
      shippingAddress: billingAddress,
      paymentMethod: "razorpay",
      userId,
      userOrderCount,
      userCouponUseCount: redemption?.count || 0,
    });
    snapshots = couponResult.items;
    pricing = couponResult.pricing;
    appliedCoupon = couponResult;
  }

  return {
    shippingAddress: billingAddress,
    shipping,
    items: snapshots,
    pricing,
    calculatedItems,
    couponCode,
    appliedCoupon,
  };
};

const createRazorpayOrder = asyncHandler(async (req, res) => {
  if (!paymentClient) {
    return errorResponse(
      res,
      "Razorpay is not configured. Add the RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.",
      500,
    );
  }

  const clientRequestId = String(req.body.clientRequestId || "").trim();
  if (!clientRequestId || clientRequestId.length > 100) {
    return errorResponse(res, "A valid order request id is required", 400);
  }

  try {
    const orderPayload = await buildPaymentOrder({
      userId: req.user.sub,
      items: req.body.items,
      shippingAddress: req.body.shippingAddress,
      customerLocation: req.body.customerLocation,
      couponCode: req.body.couponCode,
    });

    const amountInPaise = Math.round(Number(orderPayload.pricing.grandTotal) * 100);
    if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
      return errorResponse(res, "Unable to calculate a valid payment amount.", 400);
    }

    const receiptValue = String(req.body.receipt || clientRequestId || "")
      .trim()
      .slice(0, 40);

    const razorpayOrder = await paymentClient.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: receiptValue || `rjg-${Date.now()}`,
      notes: {
        clientRequestId,
        userId: String(req.user.sub),
        paymentType: "online",
      },
    });

    return successResponse(
      res,
      {
        order: {
          ...orderPayload,
          amount: amountInPaise,
          clientRequestId,
          razorpayOrderId: razorpayOrder.id,
        },
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt,
          key: env.razorpayKeyId,
        },
      },
      "Payment order created",
      200,
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Unable to create a Razorpay order.",
      400,
    );
  }
});

const verifyPayment = asyncHandler(async (req, res) => {
  if (!paymentClient) {
    return errorResponse(
      res,
      "Razorpay is not configured. Add the RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.",
      500,
    );
  }

  const clientRequestId = String(req.body.clientRequestId || "").trim();
  if (!clientRequestId) {
    return errorResponse(res, "A valid order request id is required", 400);
  }

  const razorpayOrderId = String(req.body.razorpay_order_id || "").trim();
  const razorpayPaymentId = String(req.body.razorpay_payment_id || "").trim();
  const razorpaySignature = String(req.body.razorpay_signature || "").trim();

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return errorResponse(res, "Payment verification data is incomplete.", 400);
  }

  const generatedSignature = crypto
    .createHmac("sha256", env.razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (generatedSignature !== razorpaySignature) {
    return errorResponse(res, "Payment verification failed.", 400);
  }

  const existingOrder = await Order.findOne({
    clientRequestId,
    userId: req.user.sub,
  });
  if (existingOrder) {
    return successResponse(res, existingOrder, "Payment verified and order already exists", 200);
  }

  try {
    const orderPayload = await buildPaymentOrder({
      userId: req.user.sub,
      items: req.body.items,
      shippingAddress: req.body.shippingAddress,
      customerLocation: req.body.customerLocation,
      couponCode: req.body.couponCode,
    });

    const orderDocument = {
      orderNumber: getOrderNumber(),
      clientRequestId,
      userId: req.user.sub,
      items: orderPayload.items,
      shippingAddress: orderPayload.shippingAddress,
      shipping: orderPayload.shipping,
      pricing: orderPayload.pricing,
      ...(orderPayload.appliedCoupon
        ? {
            coupon: {
              couponId: orderPayload.appliedCoupon.coupon.id,
              code: orderPayload.appliedCoupon.coupon.code,
              type: orderPayload.appliedCoupon.coupon.type,
              discount: orderPayload.appliedCoupon.discount,
              shippingDiscount: orderPayload.appliedCoupon.shippingDiscount,
              originalShipping: orderPayload.appliedCoupon.originalShipping,
              finalShipping: orderPayload.appliedCoupon.finalShipping,
              campaignName: orderPayload.appliedCoupon.coupon.campaignName,
            },
          }
        : {}),
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      paymentId: razorpayPaymentId,
      razorpayOrderId: razorpayOrderId,
      razorpayPaymentId: razorpayPaymentId,
      razorpaySignature: razorpaySignature,
      orderStatus: "received",
    };

    const session = await mongoose.startSession();
    let savedOrder;
    try {
      await session.withTransaction(async () => {
        if (orderPayload.appliedCoupon) {
          const couponId = orderPayload.appliedCoupon.coupon.id;
          const currentCoupon = await Coupon.findById(couponId).session(session);
          if (!currentCoupon) throw new Error("Coupon not found.");
          const [userOrderCount, redemption] = await Promise.all([
            Order.countDocuments({
              userId: req.user.sub,
              orderStatus: { $ne: "cancelled" },
            }).session(session),
            CouponRedemption.findOne({
              couponId: currentCoupon._id,
              userId: req.user.sub,
            }).session(session),
          ]);
          const safeCouponResult = evaluateCoupon({
            coupon: currentCoupon,
            items: orderPayload.calculatedItems.map((item) => item.snapshot),
            shipping: orderPayload.shipping,
            shippingAddress: orderPayload.shippingAddress,
            paymentMethod: "razorpay",
            userId: req.user.sub,
            userOrderCount,
            userCouponUseCount: redemption?.count || 0,
          });
          const usageFilter = {
            _id: currentCoupon._id,
            isActive: true,
            startDate: { $lte: new Date() },
            expiryDate: { $gte: new Date() },
          };
          if (currentCoupon.usageLimit != null) {
            usageFilter.$or = [
              { usedCount: { $lt: currentCoupon.usageLimit } },
              { usedCount: { $exists: false } },
            ];
          }
          const reservedCoupon = await Coupon.findOneAndUpdate(
            usageFilter,
            { $inc: { usedCount: 1 } },
            { new: true, session },
          );
          if (!reservedCoupon) throw new Error("Coupon usage limit reached.");

          const redemptionFilter = { couponId: currentCoupon._id, userId: req.user.sub };
          if (currentCoupon.perUserLimit != null)
            redemptionFilter.count = { $lt: currentCoupon.perUserLimit };

          await CouponRedemption.updateOne(
            { couponId: currentCoupon._id, userId: req.user.sub },
            { $setOnInsert: { count: 0 } },
            { upsert: true, session, setDefaultsOnInsert: false },
          );
          const updatedRedemption = await CouponRedemption.findOneAndUpdate(
            redemptionFilter,
            {
              $inc: { count: 1 },
              $set: { lastOrderId: new mongoose.Types.ObjectId() },
            },
            { new: true, session },
          );
          if (!updatedRedemption) {
            throw new Error(
              "You have already used this coupon the maximum number of times.",
            );
          }
          orderDocument.coupon = {
            ...orderDocument.coupon,
            discount: safeCouponResult.discount,
            shippingDiscount: safeCouponResult.shippingDiscount,
            originalShipping: safeCouponResult.originalShipping,
            finalShipping: safeCouponResult.finalShipping,
          };
          orderDocument.pricing = safeCouponResult.pricing;
          orderDocument.items = safeCouponResult.items;
        }

        for (const item of orderPayload.calculatedItems) {
          const updated = await Product.findOneAndUpdate(
            {
              _id: item.product._id,
              stock: { $gte: item.snapshot.quantityKg },
            },
            { $inc: { stock: -item.snapshot.quantityKg } },
            { new: true, session },
          );
          if (!updated) {
            throw new Error(
              `${item.product.title} is no longer available in the requested KG quantity.`,
            );
          }
        }

        savedOrder = await Order.create([orderDocument], { session });
        savedOrder = savedOrder[0];
      });
    } finally {
      await session.endSession();
    }

    return successResponse(res, savedOrder, "Payment verified and order placed", 201);
  } catch (error) {
    return errorResponse(
      res,
      error.message.includes("duplicate")
        ? "This order request was already processed."
        : error.message,
      400,
    );
  }
});

module.exports = {
  createRazorpayOrder,
  getPaymentConfig,
  verifyPayment,
};
