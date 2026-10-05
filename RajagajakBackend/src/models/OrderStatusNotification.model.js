const mongoose = require("mongoose");

const orderStatusNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["received", "confirmed", "shipped", "delivered", "cancelled"],
      required: true,
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderStatusNotificationSchema.index({ userId: 1, readAt: 1, createdAt: 1 });

module.exports = mongoose.model(
  "OrderStatusNotification",
  orderStatusNotificationSchema,
);
