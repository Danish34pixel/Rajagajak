const mongoose = require("mongoose");
const crypto = require("crypto");
const Order = require("../models/Order.model");
const Product = require("../models/Product.model");
const User = require("../models/User.model");
const asyncHandler = require("../utils/asyncHandler");
const { errorResponse, successResponse } = require("../utils/response");

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
  address: String(address.address || "").trim(),
  city: String(address.city || "").trim(),
  state: String(address.state || "").trim(),
  pincode: String(address.pincode || address.pinCode || "").trim(),
});

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

const buildPricing = (snapshots) => {
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
  const shippingCharges = 0;
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
  if (
    !shippingAddress.name ||
    !/^[6-9]\d{9}$/.test(shippingAddress.mobile) ||
    !shippingAddress.address ||
    !shippingAddress.city ||
    !shippingAddress.state ||
    !/^\d{6}$/.test(shippingAddress.pincode)
  )
    return errorResponse(
      res,
      "Please provide a complete valid delivery address.",
      400,
    );
  let calculated;
  try {
    calculated = await calculateItems(req.body.items);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
  const snapshots = calculated.map((item) => item.snapshot);
  const pricing = buildPricing(snapshots);
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
    const orderNumber = `RJG-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const order = await Order.create({
      orderNumber,
      clientRequestId,
      userId: req.user.sub,
      items: snapshots,
      shippingAddress,
      pricing,
      paymentMethod: "cod",
      paymentStatus: "cod",
    });
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
  listMyOrders,
  getMyOrder,
  cancelOrder,
  listAdminOrders,
  getAdminOrder,
  updateOrderStatus,
  cancelAdminOrder,
};
