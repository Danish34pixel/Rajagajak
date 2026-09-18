const asyncHandler = require("../utils/asyncHandler");
const Coupon = require("../models/Coupon.model");
const { errorResponse, successResponse } = require("../utils/response");

const statusOf = (coupon, now = new Date()) =>
  !coupon.isActive
    ? "DISABLED"
    : now < coupon.startDate
      ? "UPCOMING"
      : now > coupon.expiryDate
        ? "EXPIRED"
        : "ACTIVE";
const normalize = (body) => {
  const discountType = body.discountType;
  const discountValue = Number(body.discountValue);
  const minimumOrderValue = Number(body.minimumOrderValue || 0);
  const maximumDiscount =
    body.maximumDiscount === "" || body.maximumDiscount == null
      ? null
      : Number(body.maximumDiscount);
  const startDate = new Date(body.startDate);
  const expiryDate = new Date(body.expiryDate);
  if (
    !/^[A-Za-z0-9_-]+$/.test(String(body.code || "").trim()) ||
    !String(body.title || "").trim() ||
    !["percentage", "fixed"].includes(discountType) ||
    !Number.isFinite(discountValue) ||
    discountValue <= 0 ||
    (discountType === "percentage" && discountValue > 100) ||
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
    discountType,
    discountValue,
    minimumOrderValue,
    maximumDiscount,
    startDate,
    expiryDate,
    isActive: body.isActive !== false,
  };
};
const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  return successResponse(
    res,
    coupons.map((coupon) => ({
      ...coupon.toObject(),
      status: statusOf(coupon),
    })),
  );
});
const getCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return errorResponse(res, "Coupon not found", 404);
  return successResponse(res, {
    ...coupon.toObject(),
    status: statusOf(coupon),
  });
});
const createCoupon = asyncHandler(async (req, res) => {
  const data = normalize(req.body);
  if (!data) return errorResponse(res, "Invalid coupon data", 400);
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
    throw error;
  }
});
const updateCoupon = asyncHandler(async (req, res) => {
  const data = normalize(req.body);
  if (!data) return errorResponse(res, "Invalid coupon data", 400);
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
  }).sort({ expiryDate: 1 });
  return successResponse(res, coupons);
});
const applyCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body.code || "")
    .trim()
    .toUpperCase();
  const subtotal = Number(req.body.subtotal);
  const coupon = await Coupon.findOne({ code });
  const now = new Date();
  if (!coupon) return errorResponse(res, "Coupon not found", 404);
  if (!coupon.isActive)
    return errorResponse(res, "Coupon is currently unavailable", 400);
  if (now < coupon.startDate)
    return errorResponse(res, "Coupon is not active yet", 400);
  if (now > coupon.expiryDate)
    return errorResponse(res, "Coupon has expired", 400);
  if (!Number.isFinite(subtotal) || subtotal < coupon.minimumOrderValue)
    return errorResponse(
      res,
      `Minimum order value is ₹${coupon.minimumOrderValue}`,
      400,
    );
  let discount =
    coupon.discountType === "percentage"
      ? (subtotal * coupon.discountValue) / 100
      : coupon.discountValue;
  if (coupon.maximumDiscount != null)
    discount = Math.min(discount, coupon.maximumDiscount);
  discount = Math.min(Number(discount.toFixed(2)), subtotal);
  return successResponse(res, {
    coupon: coupon.code,
    discount,
    subtotal,
    finalTotal: Number((subtotal - discount).toFixed(2)),
  });
});
module.exports = {
  listCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  activeCoupons,
  applyCoupon,
};
