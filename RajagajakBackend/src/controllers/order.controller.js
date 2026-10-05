const mongoose = require("mongoose");
const crypto = require("crypto");
const Order = require("../models/Order.model");
const Product = require("../models/Product.model");
const User = require("../models/User.model");
const Coupon = require("../models/Coupon.model");
const CouponRedemption = require("../models/CouponRedemption.model");
const OrderStatusNotification = require("../models/OrderStatusNotification.model");
const asyncHandler = require("../utils/asyncHandler");
const { errorResponse, successResponse } = require("../utils/response");
const {
  DELIVERY_AREA_ERROR,
  calculateDelivery,
} = require("../services/shipping.service");
const { evaluateCoupon } = require("../services/coupon.service");

const round = (value) => Number(value.toFixed(2));
const validStatuses = [
  "received",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];
const nextStatuses = {
  received: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
const canCancel = (status) => status === "received" || status === "confirmed";
const isId = (value) => mongoose.Types.ObjectId.isValid(value);

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
  if (error.message === DELIVERY_AREA_ERROR) return DELIVERY_AREA_ERROR;
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

const calculateItems = async (requestedItems) => {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0)
    throw new Error("Your cart is empty.");
  const merged = new Map();
  requestedItems.forEach((item) => {
    const quantityKg = Number(item.quantityKg);
    if (
      !isId(item.productId) ||
      !Number.isFinite(quantityKg) ||
      quantityKg <= 0 ||
      quantityKg > 10000
    )
      throw new Error("Invalid order item.");
    const key = item.productId;
    merged.set(key, {
      productId: item.productId,
      quantityKg: Number(
        ((merged.get(key)?.quantityKg || 0) + quantityKg).toFixed(3),
      ),
    });
  });
  const items = [];
  for (const requested of merged.values()) {
    const product = await Product.findById(requested.productId);
    if (!product)
      throw new Error("One of the products is no longer available.");
    if (!Number.isFinite(Number(product.stock)) || product.stock < 0)
      throw new Error(
        `${product.title} is not currently available for ordering.`,
      );
    if (requested.quantityKg > product.stock)
      throw new Error(
        `Only ${product.stock} KG is available for ${product.title}.`,
      );
    const unitPrice = Number(product.finalPrice);
    const mrpTotal = round(product.mrp * requested.quantityKg);
    const sellingTotal = round(unitPrice * requested.quantityKg);
    const discountAmount = round(mrpTotal - sellingTotal);
    const gstAmount = round(
      (sellingTotal * Number(product.gstPercentage || 0)) / 100,
    );
    const itemTotal = round(sellingTotal + gstAmount);
    items.push({
      product,
      snapshot: {
        productId: product._id,
        productName: product.title,
        category: product.category || "",
        image: product.images?.[0] || product.image || "",
        quantityKg: requested.quantityKg,
        pricePerKg: unitPrice,
        mrpPerKg: product.mrp,
        discountPercentage: product.discount,
        discountAmount,
        gstPercentage: product.gstPercentage || 0,
        gstAmount,
        taxableAmount: sellingTotal,
        itemTotal,
      },
    });
  }
  return items;
};

const buildPricing = (snapshots, shippingCharges = 0) => {
  const subtotal = round(
    snapshots.reduce((sum, item) => sum + item.mrpPerKg * item.quantityKg, 0),
  );
  const discount = round(
    snapshots.reduce((sum, item) => sum + item.discountAmount, 0),
  );
  const taxableAmount = round(
    snapshots.reduce((sum, item) => sum + item.taxableAmount, 0),
  );
  const totalGST = round(
    snapshots.reduce((sum, item) => sum + item.gstAmount, 0),
  );
  return {
    subtotal,
    discount,
    taxableAmount,
    totalGST,
    shippingCharges,
    grandTotal: round(taxableAmount + totalGST + shippingCharges),
  };
};

const quoteOrder = asyncHandler(async (req, res) => {
  try {
    const calculated = await calculateItems(req.body.items);
    const snapshots = calculated.map((item) => item.snapshot);
    return successResponse(res, {
      items: snapshots,
      pricing: buildPricing(snapshots),
    });
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
});

const quoteShipping = asyncHandler(async (req, res) => {
  try {
    const shipping = await calculateDelivery({
      customerLocation: req.body.customerLocation,
      shippingAddress: req.body.shippingAddress,
    });
    return successResponse(res, { shipping });
  } catch (error) {
    return errorResponse(res, deliveryErrorMessage(error), 400);
  }
});

const createOrder = asyncHandler(async (req, res) => {
  const clientRequestId = String(req.body.clientRequestId || "").trim();
  if (!clientRequestId || clientRequestId.length > 100)
    return errorResponse(res, "A valid order request id is required", 400);
  const existing = await Order.findOne({
    clientRequestId,
    userId: req.user.sub,
  });
  if (existing) return successResponse(res, existing, "Order already created");
  const shippingAddress = normalizeAddress(req.body.shippingAddress);
  const hasCustomerLocation = Boolean(req.body.customerLocation);
  if (
    !shippingAddress.name ||
    !/^[6-9]\d{9}$/.test(shippingAddress.mobile) ||
    (!hasCustomerLocation &&
      (!shippingAddress.address ||
        !shippingAddress.city ||
        !shippingAddress.state ||
        !/^\d{6}$/.test(shippingAddress.pincode)))
  )
    return errorResponse(
      res,
      "Please provide a complete valid delivery address.",
      400,
    );
  let shipping;
  try {
    shipping = await calculateDelivery({
      customerLocation: req.body.customerLocation,
      shippingAddress,
    });
    if (hasCustomerLocation) {
      const location = shipping.location;
      Object.assign(shippingAddress, {
        address: shipping.fullAddress,
        fullAddress: shipping.fullAddress,
        building: location.building,
        houseNumber: location.houseNumber,
        road: location.road,
        locality: location.locality,
        district: location.district,
        area: location.area,
        city: location.city,
        state: location.state,
        pincode: location.pincode,
        country: location.country,
        locationDetected: true,
        locationSource: "gps",
      });
    } else {
      shippingAddress.fullAddress = [
        shippingAddress.address,
        shippingAddress.area,
        shippingAddress.city,
        [shippingAddress.state, shippingAddress.pincode]
          .filter(Boolean)
          .join(" - "),
      ]
        .filter(Boolean)
        .join(", ");
      shippingAddress.locationDetected = false;
      shippingAddress.locationSource = "manual";
    }
    shippingAddress.latitude = shipping.destination.latitude;
    shippingAddress.longitude = shipping.destination.longitude;
  } catch (error) {
    return errorResponse(res, deliveryErrorMessage(error), 400);
  }
  let calculated;
  try {
    calculated = await calculateItems(req.body.items);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
  const baseSnapshots = calculated.map((item) => item.snapshot);
  let snapshots = baseSnapshots;
  let pricing = buildPricing(snapshots, shipping.shippingCharge);
  let coupon = null;
  let couponResult = null;
  const couponCode = String(req.body.couponCode || "")
    .trim()
    .toUpperCase();
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode });
    if (!coupon) return errorResponse(res, "Coupon not found.", 400);
    try {
      const userId = req.user.sub;
      const [userOrderCount, redemption] = await Promise.all([
        Order.countDocuments({ userId, orderStatus: { $ne: "cancelled" } }),
        CouponRedemption.findOne({ couponId: coupon._id, userId }),
      ]);
      couponResult = evaluateCoupon({
        coupon,
        items: snapshots,
        shipping,
        shippingAddress,
        paymentMethod: "cod",
        userId,
        userOrderCount,
        userCouponUseCount: redemption?.count || 0,
      });
      snapshots = couponResult.items;
      pricing = couponResult.pricing;
    } catch (error) {
      return errorResponse(res, error.message, 400);
    }
  }
  const orderNumber = () =>
    `RJG-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const makeOrderSnapshot = (items, orderPricing, appliedCoupon = null) => ({
    orderNumber: orderNumber(),
    clientRequestId,
    userId: req.user.sub,
    items,
    shippingAddress,
    shipping,
    pricing: orderPricing,
    ...(appliedCoupon
      ? {
          coupon: {
            couponId: coupon._id,
            code: coupon.code,
            type: appliedCoupon.coupon.type,
            discount: appliedCoupon.discount,
            shippingDiscount: appliedCoupon.shippingDiscount,
            originalShipping: appliedCoupon.originalShipping,
            finalShipping: appliedCoupon.finalShipping,
            campaignName: appliedCoupon.coupon.campaignName,
          },
        }
      : {}),
    paymentMethod: "cod",
    paymentStatus: "cod",
  });

  if (couponResult) {
    const session = await mongoose.startSession();
    let createdOrder;
    try {
      await session.withTransaction(async () => {
        const now = new Date();
        const currentCoupon = await Coupon.findById(coupon._id).session(
          session,
        );
        if (!currentCoupon) throw new Error("Coupon not found.");
        const [userOrderCount, redemption] = await Promise.all([
          Order.countDocuments({
            userId: req.user.sub,
            orderStatus: { $ne: "cancelled" },
          }).session(session),
          CouponRedemption.findOne({
            couponId: coupon._id,
            userId: req.user.sub,
          }).session(session),
        ]);
        couponResult = evaluateCoupon({
          coupon: currentCoupon,
          items: baseSnapshots,
          shipping,
          shippingAddress,
          paymentMethod: "cod",
          userId: req.user.sub,
          userOrderCount,
          userCouponUseCount: redemption?.count || 0,
          now,
        });
        coupon = currentCoupon;
        snapshots = couponResult.items;
        pricing = couponResult.pricing;
        const usageFilter = {
          _id: currentCoupon._id,
          isActive: true,
          startDate: { $lte: now },
          expiryDate: { $gte: now },
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

        const redemptionFilter = {
          couponId: currentCoupon._id,
          userId: req.user.sub,
        };
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
        if (!updatedRedemption)
          throw new Error(
            "You have already used this coupon the maximum number of times.",
          );

        for (const item of calculated) {
          const updated = await Product.findOneAndUpdate(
            {
              _id: item.product._id,
              stock: { $gte: item.snapshot.quantityKg },
            },
            { $inc: { stock: -item.snapshot.quantityKg } },
            { new: true, session },
          );
          if (!updated)
            throw new Error(
              `${item.product.title} is no longer available in the requested KG quantity.`,
            );
        }
        createdOrder = new Order(
          makeOrderSnapshot(snapshots, pricing, couponResult),
        );
        await createdOrder.save({ session });
        await CouponRedemption.updateOne(
          { couponId: currentCoupon._id, userId: req.user.sub },
          { $set: { lastOrderId: createdOrder._id } },
          { session },
        );
      });
      return successResponse(res, createdOrder, "Order placed", 201);
    } catch (error) {
      return errorResponse(
        res,
        error.message.includes("duplicate")
          ? "This order request was already processed."
          : error.message,
        400,
      );
    } finally {
      await session.endSession();
    }
  }

  const orderSnapshot = makeOrderSnapshot(snapshots, pricing);
  const decremented = [];
  try {
    for (const item of calculated) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product._id, stock: { $gte: item.snapshot.quantityKg } },
        { $inc: { stock: -item.snapshot.quantityKg } },
        { new: true },
      );
      if (!updated)
        throw new Error(
          `${item.product.title} is no longer available in the requested KG quantity.`,
        );
      decremented.push(item.snapshot);
    }
    const order = await Order.create(orderSnapshot);
    return successResponse(res, order, "Order placed", 201);
  } catch (error) {
    for (const item of decremented)
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stock: item.quantityKg } },
      );
    return errorResponse(
      res,
      error.message.includes("duplicate")
        ? "This order request was already processed."
        : error.message,
      400,
    );
  }
});

const listMyOrders = asyncHandler(async (req, res) =>
  successResponse(
    res,
    await Order.find({ userId: req.user.sub }).sort({ createdAt: -1 }),
  ),
);
const getMyOrder = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return errorResponse(res, "Order not found", 404);
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user.sub,
  });
  return order
    ? successResponse(res, order)
    : errorResponse(res, "Order not found", 404);
});

const cancelOrder = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return errorResponse(res, "Order not found", 404);
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user.sub,
  });
  if (!order) return errorResponse(res, "Order not found", 404);
  if (!canCancel(order.orderStatus))
    return errorResponse(res, "This order can no longer be cancelled.", 400);
  const cancelled = await Order.findOneAndUpdate(
    {
      _id: order._id,
      userId: req.user.sub,
      orderStatus: { $in: ["received", "confirmed"] },
    },
    {
      $set: {
        orderStatus: "cancelled",
        cancelledBy: "user",
        cancelledAt: new Date(),
        cancellationReason: String(req.body.reason || "").trim(),
      },
    },
    { new: true },
  );
  if (!cancelled)
    return errorResponse(res, "This order has already changed status.", 409);
  for (const item of order.items)
    await Product.updateOne(
      { _id: item.productId },
      { $inc: { stock: item.quantityKg } },
    );
  return successResponse(res, cancelled, "Order cancelled");
});

const listAdminOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (validStatuses.includes(req.query.status))
    filter.orderStatus = req.query.status;
  const orders = await Order.find(filter)
    .populate("userId", "name mobile email")
    .sort({ createdAt: -1 });
  return successResponse(res, orders);
});
const getAdminOrder = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return errorResponse(res, "Order not found", 404);
  const order = await Order.findById(req.params.id).populate(
    "userId",
    "name mobile email",
  );
  return order
    ? successResponse(res, order)
    : errorResponse(res, "Order not found", 404);
});
const updateOrderStatus = asyncHandler(async (req, res) => {
  if (!isId(req.params.id) || !validStatuses.includes(req.body.status))
    return errorResponse(res, "Invalid order status", 400);
  const order = await Order.findById(req.params.id);
  if (!order) return errorResponse(res, "Order not found", 404);
  if (!nextStatuses[order.orderStatus].includes(req.body.status))
    return errorResponse(res, "Invalid order status transition", 400);
  order.orderStatus = req.body.status;
  await order.save();
  await OrderStatusNotification.create({
    userId: order.userId,
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.orderStatus,
  });
  return successResponse(res, order, "Order status updated");
});
const cancelAdminOrder = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return errorResponse(res, "Order not found", 404);
  const order = await Order.findById(req.params.id);
  if (!order) return errorResponse(res, "Order not found", 404);
  if (!canCancel(order.orderStatus))
    return errorResponse(res, "This order can no longer be cancelled.", 400);
  const cancelled = await Order.findOneAndUpdate(
    { _id: order._id, orderStatus: { $in: ["received", "confirmed"] } },
    {
      $set: {
        orderStatus: "cancelled",
        cancelledBy: "admin",
        cancelledAt: new Date(),
        cancellationReason: String(req.body.reason || "").trim(),
      },
    },
    { new: true },
  );
  if (!cancelled)
    return errorResponse(res, "This order has already changed status.", 409);
  await OrderStatusNotification.create({
    userId: cancelled.userId,
    orderId: cancelled._id,
    orderNumber: cancelled.orderNumber,
    status: cancelled.orderStatus,
  });
  for (const item of order.items)
    await Product.updateOne(
      { _id: item.productId },
      { $inc: { stock: item.quantityKg } },
    );
  return successResponse(res, cancelled, "Order cancelled");
});

module.exports = {
  createOrder,
  quoteOrder,
  quoteShipping,
  calculateItems,
  buildPricing,
  listMyOrders,
  getMyOrder,
  cancelOrder,
  listAdminOrders,
  getAdminOrder,
  updateOrderStatus,
  cancelAdminOrder,
};
