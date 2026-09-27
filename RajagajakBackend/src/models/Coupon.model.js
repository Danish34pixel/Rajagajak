const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: /^[A-Z0-9_-]+$/,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    type: {
      type: String,
      enum: [
        "percentage",
        "fixed",
        "free_shipping",
        "fixed_shipping",
        "buy_x_get_y",
        "buy_x_get_percentage",
        "buy_x_get_fixed",
      ],
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
    },
    discountValue: { type: Number, default: 0, min: 0 },
    minimumOrderValue: { type: Number, default: 0, min: 0 },
    minimumQuantity: { type: Number, default: 0, min: 0 },
    maximumDiscount: { type: Number, default: null, min: 0 },
    buyQuantity: { type: Number, default: null, min: 0 },
    getQuantity: { type: Number, default: null, min: 0 },
    getDiscountPercentage: { type: Number, default: null, min: 0, max: 100 },
    getDiscountAmount: { type: Number, default: null, min: 0 },
    applicableProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],
    applicableCategories: { type: [String], default: [] },
    eligibilityType: {
      type: String,
      enum: [
        "everyone",
        "first_order",
        "returning",
        "specific_users",
        "referral",
        "cart_abandonment",
        "reorder",
        "loyalty",
        "birthday",
        "review_reward",
      ],
      default: "everyone",
    },
    eligibleUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    cities: { type: [String], default: [] },
    pincodes: { type: [String], default: [] },
    radiusKm: { type: Number, default: null, min: 0 },
    paymentMethods: {
      type: [String],
      enum: ["cod", "online", "upi", "razorpay", "stripe"],
      default: [],
    },
    allowedDays: {
      type: [Number],
      default: [],
      validate: (days) => days.every((day) => day >= 0 && day <= 6),
    },
    usageLimit: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: null, min: 1 },
    stackingAllowed: { type: Boolean, default: false },
    campaignName: { type: String, default: "", trim: true, maxlength: 120 },
    campaignType: {
      type: String,
      default: "standard",
      trim: true,
      maxlength: 50,
    },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

couponSchema.index({ code: 1 }, { unique: true });
module.exports = mongoose.model("Coupon", couponSchema);
