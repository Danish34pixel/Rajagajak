const asyncHandler = require("../utils/asyncHandler");
const Product = require("../models/Product.model");
const { errorResponse, successResponse } = require("../utils/response");

const withImageArray = (product) => {
  const value = product.toObject ? product.toObject() : product;
  return {
    ...value,
    images: value.images?.length
      ? value.images
      : value.image
        ? [value.image]
        : [],
  };
};

const normalizeProduct = (body) => {
  const mrp = Number(body.mrp);
  const discount = Number(body.discount);
  const bulletPoints = Array.isArray(body.bulletPoints)
    ? body.bulletPoints.map((point) => String(point).trim()).filter(Boolean)
    : [];
  const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
  if (
    !String(body.title || "").trim() ||
    !Number.isFinite(mrp) ||
    mrp < 0 ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount > 100 ||
    images.length > 5
  )
    return null;
  return {
    title: body.title.trim(),
    bulletPoints,
    images,
    mrp,
    discount,
    finalPrice: Number((mrp - (mrp * discount) / 100).toFixed(2)),
  };
};

const publicProductFields =
  "title bulletPoints images image mrp discount finalPrice createdAt updatedAt";

const listPublicProducts = asyncHandler(async (req, res) =>
  successResponse(
    res,
    (
      await Product.find().select(publicProductFields).sort({ createdAt: -1 })
    ).map(withImageArray),
  ),
);

const getPublicProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select(
    publicProductFields,
  );
  if (!product) return errorResponse(res, "Product not found", 404);
  return successResponse(res, withImageArray(product));
});

const listProducts = asyncHandler(async (req, res) =>
  successResponse(
    res,
    (await Product.find().sort({ createdAt: -1 })).map(withImageArray),
  ),
);
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return errorResponse(res, "Product not found", 404);
  return successResponse(res, withImageArray(product));
});
const createProduct = asyncHandler(async (req, res) => {
  const data = normalizeProduct(req.body);
  if (!data) return errorResponse(res, "Invalid product data", 400);
  return successResponse(
    res,
    withImageArray(
      await Product.create({ ...data, createdBy: req.userRecord._id }),
    ),
    "Product created",
    201,
  );
});
const updateProduct = asyncHandler(async (req, res) => {
  const data = normalizeProduct(req.body);
  if (!data) return errorResponse(res, "Invalid product data", 400);
  const product = await Product.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  if (!product) return errorResponse(res, "Product not found", 404);
  return successResponse(res, withImageArray(product), "Product updated");
});
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return errorResponse(res, "Product not found", 404);
  return successResponse(res, null, "Product deleted");
});

module.exports = {
  listPublicProducts,
  getPublicProduct,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
