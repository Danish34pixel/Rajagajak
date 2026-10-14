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
const {
  verifyRazorpaySignature,
  isCapturedRazorpayPayment,
  getRazorpayConfigurationIssue,
  getRazorpayErrorDiagnostics,
} = require("../services/razorpay-payment.service");

const paymentInputError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

const razorpayConfigurationIssue = getRazorpayConfigurationIssue({
  keyId: env.razorpayKeyId,
  keySecret: env.razorpayKeySecret,
});
if (razorpayConfigurationIssue) {
  console.error(
    "[payment] Razorpay configuration is invalid",
    JSON.stringify({ issue: razorpayConfigurationIssue }),
  );
}
const paymentClient = !razorpayConfigurationIssue
  ? new Razorpay({
      key_id: env.razorpayKeyId,
      key_secret: env.razorpayKeySecret,
    })
  : null;

const round = (value) => Number(value.toFixed(2));

const getPaymentConfig = (req, res) => {
  return res.json({ keyId: paymentClient ? env.razorpayKeyId : null });
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

const isDeliveryInputError = (error) =>
  [
    "A valid delivery location is required.",
    "A complete delivery address is required.",
    "We couldn't find that delivery address.",
    "We couldn't get a readable address for your current location.",
    "Sorry, we currently deliver only within our delivery area.",
    "Please enter a valid delivery address.",
  ].includes(error.message);

const paymentOrderError = (error) => {
  if ([400, 409].includes(error?.statusCode))
    return { statusCode: error.statusCode, message: error.message };

  const message = String(error?.message || "");
  if (
    message === "Your cart is empty." ||
    message.startsWith("Invalid order item quantity.") ||
    message === "One of the products is no longer available."
  ) {
    return { statusCode: 400, message };
  }
  if (
    / is not currently available for ordering\.$/.test(message) ||
    /^Only \d+(?:\.\d+)? KG is available for .+\.$/.test(message)
  ) {
    return { statusCode: 409, message };
  }

  return null;
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
  if (!Array.isArray(items) || items.length === 0) {
    throw paymentInputError("Your cart is empty.");
  }
  if (items.some((item) => !item || typeof item !== "object")) {
    throw paymentInputError(
      "Invalid order item quantity. Choose at least 300 g in 100 g increments.",
    );
  }
  if (!shippingAddress || typeof shippingAddress !== "object") {
    throw paymentInputError("Please provide a complete valid delivery address.");
  }

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
    throw paymentInputError(
      "Please provide a complete valid delivery address.",
    );
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
    if (isDeliveryInputError(error)) {
      throw paymentInputError(deliveryErrorMessage(error));
    }
    throw Object.assign(
      new Error("Delivery location service is unavailable."),
      { statusCode: 502 },
    );
  }

  let calculatedItems;
  try {
    calculatedItems = await calculateItems(items);
  } catch (error) {
    const orderError = paymentOrderError(error);
    if (orderError)
      throw paymentInputError(orderError.message, orderError.statusCode);
    throw error;
  }
  const baseSnapshots = calculatedItems.map((item) => item.snapshot);
  let snapshots = baseSnapshots;
  let pricing = buildPricing(snapshots, shipping.shippingCharge);
  let appliedCoupon = null;

  if (couponCode) {
    const normalizedCouponCode = String(couponCode).trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: normalizedCouponCode });
    if (!coupon) throw paymentInputError("Coupon not found.");
    const [userOrderCount, redemption] = await Promise.all([
      Order.countDocuments({
        userId,
        orderStatus: { $ne: "cancelled" },
      }),
      CouponRedemption.findOne({ couponId: coupon._id, userId }),
    ]);
    let couponResult;
    try {
      couponResult = evaluateCoupon({
        coupon,
        items: snapshots,
        shipping,
        shippingAddress: billingAddress,
        paymentMethod: "razorpay",
        userId,
        userOrderCount,
        userCouponUseCount: redemption?.count || 0,
      });
    } catch (error) {
      throw paymentInputError(
        error.message || "This coupon cannot be applied to this order.",
      );
    }
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

const createRazorpayOrderHandler = ({
  client,
  keyId,
  keySecret,
  buildOrder,
  logger = console,
}) =>
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    if (String(body.paymentMethod || "").trim().toLowerCase() !== "razorpay") {
    logger.warn(
      "[payment] Order request rejected",
      JSON.stringify({ stage: "request_validation", statusCode: 400 }),
    );
    return errorResponse(
      res,
      "Razorpay is the only supported payment method.",
        400,
      );
    }
    if (!client) {
      return errorResponse(
        res,
        "Razorpay is temporarily unavailable. Please contact support.",
        503,
      );
    }

    const clientRequestId = String(body.clientRequestId || "").trim();
    if (!clientRequestId || clientRequestId.length > 100) {
      logger.warn(
        "[payment] Order request rejected",
        JSON.stringify({ stage: "request_validation", statusCode: 400 }),
      );
      return errorResponse(res, "A valid order request id is required.", 400);
    }

    let orderPayload;
    try {
      orderPayload = await buildOrder({
        userId: req.user.sub,
        items: body.items,
        shippingAddress: body.shippingAddress,
        customerLocation: body.customerLocation,
        couponCode: body.couponCode,
      });
    } catch (error) {
      const orderError = paymentOrderError(error);
      if (orderError) {
        logger.warn(
          "[payment] Order request rejected",
          JSON.stringify({
            stage: "order_validation",
            statusCode: orderError.statusCode,
          }),
        );
        return errorResponse(res, orderError.message, orderError.statusCode);
      }

      const statusCode = error?.statusCode === 502 ? 502 : 500;
      const stage =
        error?.statusCode === 502
          ? "shipping_calculation"
          : "order_calculation";
      logger.error(
        "[payment] Order calculation failed",
        JSON.stringify({
          stage,
          errorName:
            typeof error?.name === "string" &&
            /^[A-Za-z][A-Za-z0-9]*$/.test(error.name)
              ? error.name
              : "Error",
          statusCode,
        }),
      );
      return errorResponse(
        res,
        statusCode === 502
          ? "We couldn't verify the delivery location. Please try again shortly."
          : "We couldn't prepare this payment. Please try again or contact support.",
        statusCode,
      );
    }

    const grandTotal = Number(orderPayload?.pricing?.grandTotal);
    const amountInPaise = Math.round(grandTotal * 100);
    if (
      !Number.isFinite(grandTotal) ||
      !Number.isSafeInteger(amountInPaise) ||
      amountInPaise <= 0
    ) {
      logger.error(
        "[payment] Server calculated an invalid order amount",
        JSON.stringify({ stage: "amount_validation" }),
      );
      return errorResponse(
        res,
        "We couldn't calculate a valid payment amount. Please contact support.",
        500,
      );
    }

    let razorpayOrder;
    try {
      razorpayOrder = await client.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: clientRequestId.slice(0, 40),
        notes: {
          clientRequestId,
          userId: String(req.user.sub),
          paymentType: "razorpay",
        },
      });
    } catch (error) {
      const diagnostics = getRazorpayErrorDiagnostics(error, {
        keyId,
        keySecret,
        sensitiveValues: [clientRequestId, String(req.user.sub)],
      });
      logger.error(
        "[payment] Razorpay order creation failed",
        JSON.stringify({ stage: "razorpay_order_creation", ...diagnostics }),
      );
      return errorResponse(
        res,
        diagnostics.httpStatus === 401
          ? "The payment provider could not authenticate the server credentials. Please contact support."
          : "Razorpay could not create this payment order. Please try again or contact support.",
        502,
      );
    }

    if (
      !razorpayOrder?.id ||
      razorpayOrder.amount !== amountInPaise ||
      razorpayOrder.currency !== "INR"
    ) {
      logger.error(
        "[payment] Razorpay returned an invalid order response",
        JSON.stringify({ stage: "razorpay_order_response" }),
      );
      return errorResponse(
        res,
        "The payment provider returned an invalid order. Please try again or contact support.",
        502,
      );
    }

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
          key: keyId,
        },
      },
      "Payment order created",
      200,
    );
  });

const createRazorpayOrder = createRazorpayOrderHandler({
  client: paymentClient,
  keyId: env.razorpayKeyId,
  keySecret: env.razorpayKeySecret,
  buildOrder: buildPaymentOrder,
});

const verifyPayment = asyncHandler(async (req, res) => {
  if (String(req.body.paymentMethod || "").trim().toLowerCase() !== "razorpay") {
    return errorResponse(
      res,
      "Razorpay is the only supported payment method.",
      400,
    );
  }
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

  if (
    !verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
      keySecret: env.razorpayKeySecret,
    })
  ) {
    return errorResponse(res, "Payment verification failed.", 400);
  }

  const [gatewayOrder, gatewayPayment] = await Promise.all([
    paymentClient.orders.fetch(razorpayOrderId),
    paymentClient.payments.fetch(razorpayPaymentId),
  ]);
  if (
    gatewayOrder.id !== razorpayOrderId ||
    gatewayPayment.order_id !== razorpayOrderId ||
    gatewayOrder.notes?.clientRequestId !== clientRequestId ||
    gatewayOrder.notes?.userId !== String(req.user.sub)
  ) {
    return errorResponse(res, "Payment does not match this order request.", 400);
  }

  const existingOrder = await Order.findOne({
    clientRequestId,
    userId: req.user.sub,
  });
  if (existingOrder) {
    const expectedAmount = Math.round(
      Number(existingOrder.pricing.grandTotal) * 100,
    );
    if (
      existingOrder.paymentStatus !== "paid" ||
      existingOrder.paymentMethod !== "razorpay" ||
      existingOrder.razorpayOrderId !== razorpayOrderId ||
      existingOrder.razorpayPaymentId !== razorpayPaymentId ||
      !isCapturedRazorpayPayment({
        order: gatewayOrder,
        payment: gatewayPayment,
        paymentId: razorpayPaymentId,
        expectedAmount,
        clientRequestId,
        userId: req.user.sub,
      })
    ) {
      return errorResponse(res, "Payment verification failed.", 400);
    }
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
    const expectedAmount = Math.round(
      Number(orderPayload.pricing.grandTotal) * 100,
    );
    if (
      !isCapturedRazorpayPayment({
        order: gatewayOrder,
        payment: gatewayPayment,
        paymentId: razorpayPaymentId,
        expectedAmount,
        clientRequestId,
        userId: req.user.sub,
      })
    ) {
      return errorResponse(
        res,
        "Razorpay has not confirmed a successful payment for this order.",
        400,
      );
    }

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
  createRazorpayOrderHandler,
  getPaymentConfig,
  verifyPayment,
};
