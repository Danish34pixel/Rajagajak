const mongoose = require("mongoose");
const Order = require("../models/Order.model");
const Product = require("../models/Product.model");
const User = require("../models/User.model");
const OrderStatusNotification = require("../models/OrderStatusNotification.model");
const asyncHandler = require("../utils/asyncHandler");
const { errorResponse, successResponse } = require("../utils/response");
const {
  DELIVERY_AREA_ERROR,
  calculateDelivery,
} = require("../services/shipping.service");

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
    const quantityGrams = Math.round(quantityKg * 1000);
    if (
      !isId(item.productId) ||
      !Number.isFinite(quantityKg) ||
      quantityGrams < 300 ||
      Math.abs(quantityKg * 1000 - quantityGrams) > 1e-7 ||
      quantityGrams % 100 !== 0 ||
      quantityKg > 10000
    )
      throw new Error(
        "Invalid order item quantity. Choose at least 300 g in 100 g increments.",
      );
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
  const paymentMethod = String(req.body.paymentMethod || "")
    .trim()
    .toLowerCase();
  if (paymentMethod !== "razorpay") {
    return errorResponse(
      res,
      paymentMethod === "cod"
        ? "Cash on Delivery is no longer supported."
        : "Razorpay is the only supported payment method.",
      400,
    );
  }
  return errorResponse(
    res,
    "Orders can only be created after successful Razorpay payment verification.",
    400,
  );
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
  if (
    req.body.status === "confirmed" &&
    (order.paymentMethod !== "razorpay" ||
      order.paymentStatus !== "paid" ||
      !order.razorpayOrderId ||
      !order.razorpayPaymentId ||
      !order.razorpaySignature)
  )
    return errorResponse(
      res,
      "An order can only be confirmed after verified Razorpay payment.",
      400,
    );
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
