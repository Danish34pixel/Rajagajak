const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const BlogArticle = require("../models/BlogArticle.model");
const { errorResponse, successResponse } = require("../utils/response");
const {
  normalizeBlogInput,
  validatePublishContent,
} = require("../validators/blog.validator");

const publishedFilter = (now = new Date()) => ({
  status: "published",
  publishedAt: { $ne: null, $lte: now },
});

const serializeArticle = (article, { management = false } = {}) => {
  const data = article?.toObject ? article.toObject() : article;
  if (!data) return data;
  const scheduled =
    management &&
    data.status === "published" &&
    data.publishedAt &&
    new Date(data.publishedAt) > new Date();
  return {
    ...data,
    author: data.authorName || "",
    featuredImage: data.image || "",
    ...(scheduled ? { status: "scheduled" } : {}),
  };
};

const paginationFrom = (query, maximum = 50) => {
  const positiveInteger = (value, fallback, max) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0
      ? Math.min(parsed, max)
      : fallback;
  };
  return {
    page: positiveInteger(query.page, 1, Number.MAX_SAFE_INTEGER),
    limit: positiveInteger(query.limit, 10, maximum),
  };
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const listPublished = asyncHandler(async (req, res) => {
  const { page, limit } = paginationFrom(req.query);
  const filter = publishedFilter();
  const query = String(req.query.q || "").trim().slice(0, 100);
  const category = String(req.query.category || "").trim().slice(0, 80);
  if (query) {
    const regex = new RegExp(escapeRegex(query), "i");
    filter.$or = [
      { title: regex },
      { excerpt: regex },
      { content: regex },
      { category: regex },
      { tags: regex },
    ];
  }
  if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, "i");

  const [articles, total] = await Promise.all([
    BlogArticle.find(filter)
      .select("-createdBy -updatedBy -__v")
      .sort({ publishedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    BlogArticle.countDocuments(filter),
  ]);
  return res.json({
    data: articles.map((article) => serializeArticle(article)),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

const getPublishedBySlug = asyncHandler(async (req, res) => {
  const article = await BlogArticle.findOne({
    slug: req.params.slug,
    ...publishedFilter(),
  })
    .select("-createdBy -updatedBy -__v")
    .lean();
  if (!article) return errorResponse(res, "Article not found", 404);
  return res.json({ data: serializeArticle(article) });
});

const listRelated = asyncHandler(async (req, res) => {
  const filter = publishedFilter();
  const article = await BlogArticle.findOne({
    slug: req.params.slug,
    ...filter,
  }).select("_id category");
  if (!article) return errorResponse(res, "Article not found", 404);

  const related = await BlogArticle.find({
    ...publishedFilter(),
    category: article.category,
    _id: { $ne: article._id },
  })
    .select("-createdBy -updatedBy -__v")
    .sort({ publishedAt: -1, _id: -1 })
    .limit(3)
    .lean();
  return res.json({
    data: related.map((item) => serializeArticle(item)),
  });
});

const listAdminArticles = asyncHandler(async (req, res) => {
  const { page, limit } = paginationFrom(req.query, 100);
  const filter = {};
  const status = String(req.query.status || "").trim().toLowerCase();
  if (status && !["draft", "published", "scheduled"].includes(status)) {
    const error = new Error("Status must be draft, published, or scheduled.");
    error.statusCode = 400;
    throw error;
  }
  if (status === "scheduled") {
    filter.status = "published";
    filter.publishedAt = { $gt: new Date() };
  } else if (status === "published") {
    Object.assign(filter, publishedFilter());
  } else if (status) {
    filter.status = status;
  }
  const query = String(req.query.q || "").trim().slice(0, 100);
  if (query) {
    const regex = new RegExp(escapeRegex(query), "i");
    filter.$or = [
      { title: regex },
      { slug: regex },
      { category: regex },
      { authorName: regex },
    ];
  }
  const category = String(req.query.category || "").trim().slice(0, 80);
  if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, "i");
  const now = new Date();
  const [articles, total, totalArticles, published, drafts, scheduled] =
    await Promise.all([
    BlogArticle.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    BlogArticle.countDocuments(filter),
    BlogArticle.countDocuments({}),
    BlogArticle.countDocuments(publishedFilter(now)),
    BlogArticle.countDocuments({ status: "draft" }),
    BlogArticle.countDocuments({
      status: "published",
      publishedAt: { $gt: now },
    }),
  ]);
  return res.json({
    data: articles.map((article) =>
      serializeArticle(article, { management: true }),
    ),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      stats: { total: totalArticles, published, drafts, scheduled },
    },
  });
});

const ensureValidId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid article ID.");
    error.statusCode = 400;
    throw error;
  }
};

const getAdminArticle = asyncHandler(async (req, res) => {
  ensureValidId(req.params.id);
  const article = await BlogArticle.findById(req.params.id).lean();
  if (!article) return errorResponse(res, "Article not found", 404);
  return successResponse(res, serializeArticle(article, { management: true }));
});

const mapSaveError = (error) => {
  if (error.code === 11000) {
    error.message = "An article with this slug already exists.";
    error.statusCode = 409;
  } else if (error.name === "ValidationError" || error.name === "CastError") {
    error.statusCode = 400;
  }
  throw error;
};

const createArticle = asyncHandler(async (req, res) => {
  const data = normalizeBlogInput(req.body);
  try {
    const article = await BlogArticle.create({
      ...data,
      status: "draft",
      publishedAt: null,
      createdBy: req.user.sub,
      updatedBy: req.user.sub,
    });
    return successResponse(
      res,
      serializeArticle(article, { management: true }),
      "Draft article created",
      201,
    );
  } catch (error) {
    return mapSaveError(error);
  }
});

const updateArticle = asyncHandler(async (req, res) => {
  ensureValidId(req.params.id);
  const article = await BlogArticle.findById(req.params.id);
  if (!article) return errorResponse(res, "Article not found", 404);
  const data = normalizeBlogInput(req.body, { partial: true });
  Object.assign(article, data, { updatedBy: req.user.sub });
  try {
    await article.save();
    return successResponse(
      res,
      serializeArticle(article, { management: true }),
      "Article updated",
    );
  } catch (error) {
    return mapSaveError(error);
  }
});

const deleteArticle = asyncHandler(async (req, res) => {
  ensureValidId(req.params.id);
  const article = await BlogArticle.findByIdAndDelete(req.params.id);
  if (!article) return errorResponse(res, "Article not found", 404);
  return successResponse(res, null, "Article deleted");
});

const publishArticle = asyncHandler(async (req, res) => {
  ensureValidId(req.params.id);
  if (
    req.body &&
    Object.keys(req.body).some((key) => key !== "publishedAt")
  ) {
    const error = new Error("Only publishedAt may be supplied when publishing.");
    error.statusCode = 400;
    throw error;
  }
  const article = await BlogArticle.findById(req.params.id);
  if (!article) return errorResponse(res, "Article not found", 404);
  validatePublishContent(article);

  let publishedAt = new Date();
  if (req.body?.publishedAt != null) {
    if (typeof req.body.publishedAt !== "string") {
      const error = new Error("publishedAt must be a date string.");
      error.statusCode = 400;
      throw error;
    }
    publishedAt = new Date(req.body.publishedAt);
    if (Number.isNaN(publishedAt.getTime())) {
      const error = new Error("publishedAt must be a valid date.");
      error.statusCode = 400;
      throw error;
    }
  }
  article.status = "published";
  article.publishedAt = publishedAt;
  article.updatedBy = req.user.sub;
  await article.save();
  return successResponse(
    res,
    serializeArticle(article, { management: true }),
    "Article published",
  );
});

const unpublishArticle = asyncHandler(async (req, res) => {
  ensureValidId(req.params.id);
  const article = await BlogArticle.findById(req.params.id);
  if (!article) return errorResponse(res, "Article not found", 404);
  article.status = "draft";
  article.updatedBy = req.user.sub;
  await article.save();
  return successResponse(
    res,
    serializeArticle(article, { management: true }),
    "Article unpublished",
  );
});

module.exports = {
  createArticle,
  deleteArticle,
  getPublishedBySlug,
  getAdminArticle,
  listAdminArticles,
  listPublished,
  listRelated,
  publishArticle,
  unpublishArticle,
  updateArticle,
};
