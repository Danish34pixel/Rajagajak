const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const Coupon = require("../models/Coupon.model");
const Product = require("../models/Product.model");
const Order = require("../models/Order.model");
const CouponRedemption = require("../models/CouponRedemption.model");
const User = require("../models/User.model");
const { errorResponse, successResponse } = require("../utils/response");
const { calculateItems } = require("./order.controller");
const { calculateDelivery } = require("../services/shipping.service");
const { COUPON_TYPES, evaluateCoupon } = require("../services/coupon.service");

const optionalNumber = (value) =>
  value === "" || value == null ? null : Number(value);
const stringList = (value) =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

const statusOf = (coupon, now = new Date()) =>
  !coupon.isActive
    ? "DISABLED"
    : now < coupon.startDate
      ? "UPCOMING"
      : now > coupon.expiryDate
        ? "EXPIRED"
        : "ACTIVE";
const normalize = (body) => {
  const type = body.type || body.discountType;
  const discountType = ["percentage", "fixed"].includes(type)
    ? type
    : body.discountType || "fixed";
  const discountValue = Number(body.discountValue || 0);
  const minimumOrderValue = Number(body.minimumOrderValue || 0);
  const maximumDiscount = optionalNumber(body.maximumDiscount);
  const minimumQuantity = Number(body.minimumQuantity || 0);
  const usageLimit = optionalNumber(body.usageLimit);
  const perUserLimit = optionalNumber(body.perUserLimit);
  const radiusKm = optionalNumber(body.radiusKm);
  const startDate = new Date(body.startDate);
  const expiryDate = new Date(body.expiryDate);
  const requiresDiscountValue = [
    "percentage",
    "fixed",
    "fixed_shipping",
  ].includes(type);
  const objectIdsValid = (values) =>
    values.every((value) => mongoose.Types.ObjectId.isValid(value));
  const supportedPaymentMethods = [
    "cod",
    "online",
    "upi",
    "razorpay",
    "stripe",
  ];
  if (
    !/^[A-Za-z0-9_-]+$/.test(String(body.code || "").trim()) ||
    !String(body.title || "").trim() ||
    !COUPON_TYPES.includes(type) ||
    !Number.isFinite(discountValue) ||
    (requiresDiscountValue && discountValue <= 0) ||
    (type === "percentage" && discountValue > 100) ||
    !Number.isFinite(minimumQuantity) ||
    minimumQuantity < 0 ||
    (usageLimit !== null &&
      (!Number.isInteger(usageLimit) || usageLimit <= 0)) ||
    (perUserLimit !== null &&
      (!Number.isInteger(perUserLimit) || perUserLimit <= 0)) ||
    (radiusKm !== null && (!Number.isFinite(radiusKm) || radiusKm < 0)) ||
    (type.startsWith("buy_x_get_") &&
      (!Number(body.buyQuantity) ||
        !Number(body.getQuantity) ||
        Number(body.buyQuantity) <= 0 ||
        Number(body.getQuantity) <= 0)) ||
    (type === "buy_x_get_percentage" &&
      (!Number(body.getDiscountPercentage) ||
        Number(body.getDiscountPercentage) > 100)) ||
    (type === "buy_x_get_fixed" &&
      (!Number(body.getDiscountAmount) ||
        Number(body.getDiscountAmount) <= 0)) ||
    ![
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
    ].includes(body.eligibilityType || "everyone") ||
    !objectIdsValid(stringList(body.applicableProducts)) ||
    !objectIdsValid(stringList(body.eligibleUsers)) ||
    (body.eligibilityType === "specific_users" &&
      stringList(body.eligibleUsers).length === 0) ||
    (Array.isArray(body.allowedDays) &&
      body.allowedDays.some(
        (day) =>
          !Number.isInteger(Number(day)) || Number(day) < 0 || Number(day) > 6,
      )) ||
    stringList(body.paymentMethods).some(
      (method) => !supportedPaymentMethods.includes(method),
    ) ||
    stringList(body.pincodes).some((pincode) => !/^\d{6}$/.test(pincode)) ||
    !Number.isFinite(minimumOrderValue) ||
    minimumOrderValue < 0 ||
    (maximumDiscount !== null &&
      (!Number.isFinite(maximumDiscount) || maximumDiscount < 0)) ||
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(expiryDate.getTime()) ||
    expiryDate <= startDate
  )
    return null;
  return {
    code: String(body.code).trim().toUpperCase(),
    title: body.title.trim(),
    description: String(body.description || "").trim(),
    type,
    discountType,
    discountValue: type === "free_shipping" ? 0 : discountValue,
    minimumOrderValue,
    maximumDiscount,
    minimumQuantity,
    buyQuantity: optionalNumber(body.buyQuantity),
    getQuantity: optionalNumber(body.getQuantity),
    getDiscountPercentage: optionalNumber(body.getDiscountPercentage),
    getDiscountAmount: optionalNumber(body.getDiscountAmount),
    applicableProducts: stringList(body.applicableProducts),
    applicableCategories: stringList(body.applicableCategories),
    eligibilityType: body.eligibilityType || "everyone",
    eligibleUsers: stringList(body.eligibleUsers),
    cities: stringList(body.cities),
    pincodes: stringList(body.pincodes),
    radiusKm,
    paymentMethods: stringList(body.paymentMethods),
    allowedDays: Array.isArray(body.allowedDays)
      ? body.allowedDays.map(Number)
      : [],
    usageLimit,
    perUserLimit,
    stackingAllowed: false,
    campaignName: String(body.campaignName || "").trim(),
    campaignType: String(body.campaignType || "standard").trim(),
    startDate,
    expiryDate,
    isActive: body.isActive !== false,
  };
};
const selectionsExist = async (data) => {
  const [productCount, userCount, categories] = await Promise.all([
    Product.countDocuments({ _id: { $in: data.applicableProducts } }),
    User.countDocuments({ _id: { $in: data.eligibleUsers }, role: "user" }),
    Product.distinct("category", {
      category: { $in: data.applicableCategories },
    }),
  ]);
  return (
    productCount === data.applicableProducts.length &&
    userCount === data.eligibleUsers.length &&
    categories.length === data.applicableCategories.length
  );
};
const listCoupons = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.q) {
    const query = String(req.query.q).trim();
    filter.$or = [
      { code: { $regex: query, $options: "i" } },
      { title: { $regex: query, $options: "i" } },
    ];
  }
  const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
  const now = new Date();
  const status = String(req.query.status || "").toUpperCase();
  return successResponse(
    res,
    coupons
      .map((coupon) => ({
        ...coupon.toObject(),
        status: statusOf(coupon, now),
        usageRemaining:
          coupon.usageLimit == null
            ? null
            : Math.max(0, coupon.usageLimit - coupon.usedCount),
      }))
      .filter((coupon) => !status || coupon.status === status),
  );
});
const getCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return errorResponse(res, "Coupon not found", 404);
  const [analytics] = await Order.aggregate([
    { $match: { "coupon.couponId": coupon._id } },
    {
      $group: {
        _id: null,
        totalUses: { $sum: 1 },
        successfulUses: {
          $sum: { $cond: [{ $ne: ["$orderStatus", "cancelled"] }, 1, 0] },
        },
        totalDiscount: {
          $sum: {
            $cond: [
              { $ne: ["$orderStatus", "cancelled"] },
              "$coupon.discount",
              0,
            ],
          },
        },
        totalShippingDiscount: {
          $sum: {
            $cond: [
              { $ne: ["$orderStatus", "cancelled"] },
              "$coupon.shippingDiscount",
              0,
            ],
          },
        },
        revenue: {
          $sum: {
            $cond: [
              { $ne: ["$orderStatus", "cancelled"] },
              "$pricing.grandTotal",
              0,
            ],
          },
        },
        averageOrderValue: {
          $avg: {
            $cond: [
              { $ne: ["$orderStatus", "cancelled"] },
              "$pricing.grandTotal",
              null,
            ],
          },
        },
        lastUsed: {
          $max: {
            $cond: [{ $ne: ["$orderStatus", "cancelled"] }, "$createdAt", null],
          },
        },
      },
    },
  ]);
  return successResponse(res, {
    ...coupon.toObject(),
    status: statusOf(coupon),
    analytics: analytics || {
      totalUses: 0,
      successfulUses: 0,
      totalDiscount: 0,
      totalShippingDiscount: 0,
      revenue: 0,
      averageOrderValue: 0,
      lastUsed: null,
    },
    usageRemaining:
      coupon.usageLimit == null
        ? null
        : Math.max(0, coupon.usageLimit - coupon.usedCount),
  });
});
const listUsers = asyncHandler(async (req, res) => {
  const search = String(req.query.q || "").trim();
  const filter = { role: "user" };
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
      { mobile: { $regex: escaped, $options: "i" } },
    ];
  }
  const users = await User.find(filter)
    .select("name email mobile")
    .sort({ name: 1 })
    .limit(100);
  return successResponse(res, users);
});
const createCoupon = asyncHandler(async (req, res) => {
  const data = normalize(req.body);
  if (!data) return errorResponse(res, "Invalid coupon data", 400);
  if (!(await selectionsExist(data)))
    return errorResponse(
      res,
      "Select valid products, categories, and customers.",
      400,
    );
  try {
    return successResponse(
      res,
      await Coupon.create({ ...data, createdBy: req.userRecord._id }),
      "Coupon created",
      201,
    );
  } catch (error) {
    if (error.code === 11000)
      return errorResponse(res, "Coupon code already exists", 409);
    if (error.name === "ValidationError" || error.name === "CastError")
      return errorResponse(res, "Invalid coupon data", 400);
    throw error;
  }
});
const updateCoupon = asyncHandler(async (req, res) => {
  const data = normalize(req.body);
  if (!data) return errorResponse(res, "Invalid coupon data", 400);
  if (!(await selectionsExist(data)))
    return errorResponse(
      res,
      "Select valid products, categories, and customers.",
      400,
    );
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!coupon) return errorResponse(res, "Coupon not found", 404);
    return successResponse(res, coupon, "Coupon updated");
  } catch (error) {
    if (error.code === 11000)
      return errorResponse(res, "Coupon code already exists", 409);
    if (error.name === "ValidationError" || error.name === "CastError")
      return errorResponse(res, "Invalid coupon data", 400);
    throw error;
  }
});
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return errorResponse(res, "Coupon not found", 404);
  return successResponse(res, null, "Coupon deleted");
});
const activeCoupons = asyncHandler(async (req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    startDate: { $lte: now },
    expiryDate: { $gte: now },
  })
    .populate("applicableProducts", "title category")
    .sort({ expiryDate: 1 });
  const userId = req.user?.sub;
  const [userOrderCount, redemptions] = userId
    ? await Promise.all([
        Order.countDocuments({ userId, orderStatus: { $ne: "cancelled" } }),
        CouponRedemption.find({ userId }),
      ])
    : [0, []];
  const redemptionCounts = new Map(
    redemptions.map((redemption) => [
      String(redemption.couponId),
      redemption.count,
    ]),
  );
  return successResponse(
    res,
    coupons
      .filter(
        (coupon) =>
          (coupon.usageLimit == null || coupon.usedCount < coupon.usageLimit) &&
          (coupon.perUserLimit == null ||
            (redemptionCounts.get(String(coupon._id)) || 0) <
              coupon.perUserLimit) &&
          (coupon.eligibilityType !== "first_order" || userOrderCount === 0) &&
          (coupon.eligibilityType !== "returning" || userOrderCount > 0) &&
          (coupon.eligibilityType !== "specific_users" ||
            coupon.eligibleUsers.some((id) => String(id) === String(userId))) &&
          ![
            "referral",
            "cart_abandonment",
            "reorder",
            "loyalty",
            "birthday",
            "review_reward",
          ].includes(coupon.eligibilityType),
      )
      .map((coupon) => ({
        _id: coupon._id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        type: coupon.type || coupon.discountType,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minimumOrderValue: coupon.minimumOrderValue,
        expiryDate: coupon.expiryDate,
        applicableProducts: coupon.applicableProducts.map((product) => ({
          id: product._id,
          title: product.title,
        })),
        applicableCategories: coupon.applicableCategories,
        eligibilityNotice:
          coupon.applicableProducts?.length ||
          coupon.applicableCategories?.length ||
          coupon.cities?.length ||
          coupon.pincodes?.length ||
          coupon.radiusKm != null ||
          coupon.paymentMethods?.length
            ? "Eligibility depends on your cart, delivery location, or payment method."
            : "",
      })),
  );
});
const applyCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body.code || "")
    .trim()
    .toUpperCase();
  if (!code) return errorResponse(res, "Enter a coupon code.", 400);
  const coupon = await Coupon.findOne({ code });
  if (!coupon) return errorResponse(res, "Coupon not found", 404);
  try {
    const requestedItems = req.body.cartItems || req.body.items;
    const calculated = await calculateItems(requestedItems);
    const items = calculated.map((item) => item.snapshot);
    const delivery = req.body.deliveryAddress || req.body.shippingAddress;
    const shipping = await calculateDelivery({
      customerLocation: req.body.customerLocation,
      shippingAddress: delivery,
    });
    const userId = req.user?.sub;
    const accountBoundCoupon =
      (coupon.eligibilityType || "everyone") !== "everyone" ||
      Boolean(coupon.eligibleUsers?.length) ||
      coupon.perUserLimit != null;
    if (!userId && accountBoundCoupon)
      return errorResponse(
        res,
        "Sign in to check this coupon's eligibility.",
        401,
      );
    const [userOrderCount, redemption] = userId
      ? await Promise.all([
          Order.countDocuments({ userId, orderStatus: { $ne: "cancelled" } }),
          CouponRedemption.findOne({ couponId: coupon._id, userId }),
        ])
      : [0, null];
    const result = evaluateCoupon({
      coupon,
      items,
      shipping,
      shippingAddress: delivery,
      paymentMethod: req.body.paymentMethod || "cod",
      userId,
      userOrderCount,
      userCouponUseCount: redemption?.count || 0,
    });
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message || "Unable to apply coupon.", 400);
  }
});
module.exports = {
  normalizeCoupon: normalize,
  listCoupons,
  getCoupon,
  listUsers,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  activeCoupons,
  applyCoupon,
};
