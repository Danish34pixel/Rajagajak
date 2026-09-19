const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    quantityKg: { type: Number, required: true, min: 0.001 },
    pricePerKg: { type: Number, required: true, min: 0 },
    mrpPerKg: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, required: true, min: 0, max: 100 },
    discountAmount: { type: Number, required: true, min: 0 },
    gstPercentage: { type: Number, required: true, min: 0, max: 100 },
    gstAmount: { type: Number, required: true, min: 0 },
    taxableAmount: { type: Number, required: true, min: 0 },
    itemTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    clientRequestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: (items) => items.length > 0,
    },
    shippingAddress: {
      name: { type: String, required: true, trim: true },
      mobile: { type: String, required: true, match: /^[6-9]\d{9}$/ },
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, match: /^\d{6}$/ },
    },
    pricing: {
      subtotal: { type: Number, required: true, min: 0 },
      discount: { type: Number, required: true, min: 0 },
      taxableAmount: { type: Number, required: true, min: 0 },
      totalGST: { type: Number, required: true, min: 0 },
      shippingCharges: { type: Number, required: true, min: 0 },
      grandTotal: { type: Number, required: true, min: 0 },
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "cod"],
      default: "cod",
    },
    paymentMethod: { type: String, enum: ["cod", "online"], default: "cod" },
    paymentId: { type: String, default: "" },
    orderStatus: {
      type: String,
      enum: ["received", "confirmed", "shipped", "delivered", "cancelled"],
      default: "received",
      index: true,
    },
    cancellationReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    cancelledBy: { type: String, enum: ["user", "admin", ""], default: "" },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
