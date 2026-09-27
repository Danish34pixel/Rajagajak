const mongoose = require("mongoose");

const couponRedemptionSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    count: { type: Number, required: true, min: 0, default: 0 },
    lastOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  { timestamps: true },
);

couponRedemptionSchema.index({ couponId: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model("CouponRedemption", couponRedemptionSchema);
