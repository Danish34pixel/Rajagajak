const mongoose = require("mongoose");

const blogArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    excerpt: { type: String, default: "", trim: true, maxlength: 500 },
    content: { type: String, default: "" },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    tags: {
      type: [String],
      default: [],
      validate: (tags) => tags.length <= 20,
    },
    image: { type: String, default: "", trim: true, maxlength: 2048 },
    imageAlt: { type: String, default: "", trim: true, maxlength: 250 },
    seoTitle: { type: String, default: "", trim: true, maxlength: 180 },
    metaDescription: { type: String, default: "", trim: true, maxlength: 320 },
    focusKeyword: { type: String, default: "", trim: true, maxlength: 100 },
    canonicalUrl: { type: String, default: null, trim: true, maxlength: 2048 },
    authorName: { type: String, default: "", trim: true, maxlength: 120 },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    publishedAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

blogArticleSchema.index({ slug: 1 }, { unique: true });
blogArticleSchema.index({ status: 1, publishedAt: -1 });
blogArticleSchema.index({ category: 1, status: 1, publishedAt: -1 });

module.exports = mongoose.model("BlogArticle", blogArticleSchema);
