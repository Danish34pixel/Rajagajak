const sanitizeHtml = require("sanitize-html");
const { decodeHTML } = require("entities");

const editableFields = new Set([
  "title",
  "slug",
  "excerpt",
  "content",
  "category",
  "tags",
  "image",
  "featuredImage",
  "imageAlt",
  "seoTitle",
  "metaDescription",
  "focusKeyword",
  "canonicalUrl",
  "author",
  "authorName",
]);
const compatibilityFields = new Set(["status", "publishedAt"]);

const plainText = (value) =>
  decodeHTML(
    sanitizeHtml(String(value), { allowedTags: [], allowedAttributes: {} }),
  ).trim();

const sanitizeRichText = (value) =>
  sanitizeHtml(String(value), {
    allowedTags: [
      "a",
      "blockquote",
      "br",
      "em",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "img",
      "li",
      "ol",
      "p",
      "strong",
      "u",
      "ul",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height", "loading"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform(
        "a",
        { rel: "noopener noreferrer" },
        true,
      ),
    },
  });

const slugify = (value) =>
  plainText(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180)
    .replace(/-+$/g, "");

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const validateImageUrl = (value) => {
  if (!value) return "";
  if (
    !/^https:\/\/[^\s]+$/i.test(value) &&
    !/^\/(?!\/)[^\s]*$/.test(value)
  ) {
    throw badRequest("Image must be an HTTPS URL or a local absolute path.");
  }
  return value;
};

const validateCanonicalUrl = (value) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return null;

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw badRequest("Canonical URL must be an HTTP or HTTPS URL.");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !parsed.hostname
  ) {
    throw badRequest("Canonical URL must be an HTTP or HTTPS URL.");
  }
  return normalized;
};

const normalizeBlogInput = (body, { partial = false } = {}) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("A JSON article object is required.");
  }
  const unknown = Object.keys(body).filter(
    (key) => !editableFields.has(key) && !compatibilityFields.has(key),
  );
  if (unknown.length) {
    throw badRequest(`Unsupported article field: ${unknown[0]}`);
  }
  if (
    (Object.hasOwn(body, "image") && Object.hasOwn(body, "featuredImage")) ||
    (Object.hasOwn(body, "author") && Object.hasOwn(body, "authorName"))
  ) {
    throw badRequest("Use only one value for each article alias field.");
  }
  if (partial && Object.keys(body).length === 0) {
    throw badRequest("At least one article field is required.");
  }

  const data = {};
  if (
    body.status != null &&
    !["draft", "published"].includes(String(body.status))
  ) {
    throw badRequest("Status must be draft or published.");
  }
  if (body.status === "draft") data.status = "draft";
  if (body.publishedAt != null) {
    if (
      typeof body.publishedAt !== "string" ||
      Number.isNaN(new Date(body.publishedAt).getTime())
    ) {
      throw badRequest("publishedAt must be a valid date string.");
    }
  }

  for (const field of editableFields) {
    if (!Object.hasOwn(body, field)) continue;
    const value = body[field];
    if (field === "featuredImage" || field === "image") {
      const image = validateImageUrl(plainText(value ?? ""));
      data.image = image;
      continue;
    }
    if (field === "author" || field === "authorName") {
      data.authorName = plainText(value ?? "");
      continue;
    }
    if (field === "content") {
      if (typeof value !== "string" || value.length > 100000) {
        throw badRequest("Article content must be text under 100,000 characters.");
      }
      data.content = sanitizeRichText(value);
    } else if (field === "tags") {
      if (
        !Array.isArray(value) ||
        value.length > 20 ||
        value.some((tag) => typeof tag !== "string")
      ) {
        throw badRequest("Tags must be an array containing at most 20 values.");
      }
      const tags = value.map((tag) => plainText(tag).slice(0, 40)).filter(Boolean);
      if (tags.length !== value.length) {
        throw badRequest("Tags must contain non-empty text values.");
      }
      data.tags = [...new Set(tags)];
    } else {
      if (typeof value !== "string" && value != null) {
        throw badRequest(`${field} must be a string.`);
      }
      if (field === "canonicalUrl") {
        if (typeof value !== "string" && value != null) {
          throw badRequest("canonicalUrl must be a string.");
        }
        data.canonicalUrl = validateCanonicalUrl(value);
      } else if (field === "slug") {
        const slug = slugify(value);
        if (!slug) throw badRequest("Slug must contain letters or numbers.");
        data.slug = slug;
      } else {
        data[field] = plainText(value ?? "");
      }
    }
  }

  if (!partial) {
    if (!data.title?.trim()) throw badRequest("Article title is required.");
    if (!data.category?.trim()) throw badRequest("Article category is required.");
    data.slug ||= slugify(data.title);
  } else if (Object.hasOwn(body, "title") && !Object.hasOwn(body, "slug")) {
    data.slug = slugify(body.title);
  }

  if (Object.hasOwn(data, "title") && !data.title.trim()) {
    throw badRequest("Article title cannot be empty.");
  }
  if (Object.hasOwn(data, "category") && !data.category.trim()) {
    throw badRequest("Article category cannot be empty.");
  }
  if (!partial && !data.slug) throw badRequest("A valid title or slug is required.");
  if (data.slug && data.slug.length > 180) {
    throw badRequest("Slug must be 180 characters or fewer.");
  }

  return data;
};

const validatePublishContent = (article) => {
  const contentText = article.content
    ? plainText(article.content).replace(/\u00a0/g, " ").trim()
    : "";
  const hasImage = /<img\b/i.test(article.content || "");
  if (
    !article.title?.trim() ||
    !article.excerpt?.trim() ||
    (!contentText && !hasImage) ||
    !article.category?.trim()
  ) {
    throw badRequest(
      "Title, excerpt, content, and category are required before publishing.",
    );
  }
};

module.exports = {
  normalizeBlogInput,
  sanitizeRichText,
  slugify,
  validatePublishContent,
  validateCanonicalUrl,
};
