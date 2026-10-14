process.env.MONGO_URI ||= "mongodb://localhost/rajagajak-test";
process.env.JWT_SECRET ||= "test-jwt-secret";
process.env.IMAGEKIT_PRIVATE_KEY ||= "private_test_key";

const test = require("node:test");
const assert = require("node:assert/strict");
const BlogArticle = require("../src/models/BlogArticle.model");
const {
  normalizeBlogInput,
  sanitizeRichText,
  slugify,
  validatePublishContent,
} = require("../src/validators/blog.validator");
const { initialArticles } = require("../src/scripts/seed-blog-articles");

test("blog input creates a draft-ready article with a normalized slug", () => {
  assert.deepEqual(
    normalizeBlogInput({
      title: "  Gajak & Winter  ",
      category: "Gajak Guide",
      excerpt: "A short intro",
    }),
    {
      title: "Gajak & Winter",
      category: "Gajak Guide",
      excerpt: "A short intro",
      slug: "gajak-winter",
    },
  );
});

test("rich text removes executable markup and unsafe URLs", () => {
  const clean = sanitizeRichText(
    '<p onclick="alert(1)">Safe <script>alert(2)</script><a href="javascript:alert(3)">bad</a><a href="https://example.com" target="_blank">link</a><img src="https://example.com/a.jpg" onerror="alert(4)"></p>',
  );
  assert.doesNotMatch(clean, /script|onclick|onerror|javascript:/i);
  assert.match(clean, /<p>Safe /);
  assert.doesNotMatch(clean, /alert\(2\)/);
  assert.match(clean, /<img src="https:\/\/example\.com\/a\.jpg"/);
  assert.match(clean, /rel="noopener noreferrer"/);
  assert.match(clean, /href="https:\/\/example\.com"/);
});

test("article writes reject mass assignment and invalid image URLs", () => {
  assert.throws(
    () =>
      normalizeBlogInput({
        title: "Title",
        category: "Gajak",
        createdBy: "507f1f77bcf86cd799439011",
      }),
    /Unsupported article field/,
  );
  assert.throws(
    () =>
      normalizeBlogInput({
        title: "Title",
        category: "Gajak",
        image: "javascript:alert(1)",
      }),
    /Image must be/,
  );
  assert.throws(
    () => normalizeBlogInput({ title: "Title", category: "Gajak", tags: "bad" }),
    /Tags must be an array/,
  );
});

test("admin form aliases normalize and status cannot directly publish", () => {
  const article = normalizeBlogInput({
    title: "Gajak Guide",
    slug: "gajak-guide",
    category: "Gajak Guide",
    author: "Editor",
    featuredImage: "https://cdn.example.com/gajak.jpg",
    focusKeyword: "gajak",
    canonicalUrl: "https://example.com/blog/gajak-guide",
    status: "published",
    publishedAt: "2026-10-14T00:00:00.000Z",
  });
  assert.equal(article.authorName, "Editor");
  assert.equal(article.image, "https://cdn.example.com/gajak.jpg");
  assert.equal(article.focusKeyword, "gajak");
  assert.equal(article.canonicalUrl, "https://example.com/blog/gajak-guide");
  assert.equal(article.status, undefined);
  assert.equal(article.publishedAt, undefined);

  assert.equal(
    normalizeBlogInput({ status: "draft" }, { partial: true }).status,
    "draft",
  );
});

test("canonical URLs are optional and blank values normalize to null", () => {
  for (const canonicalUrl of ["", "   ", "\t\n", null]) {
    assert.equal(
      normalizeBlogInput({ canonicalUrl }, { partial: true }).canonicalUrl,
      null,
    );
  }
  assert.equal(
    Object.hasOwn(
      normalizeBlogInput({ title: "No canonical", category: "Gajak" }),
      "canonicalUrl",
    ),
    false,
  );
});

test("canonical URLs accept trimmed absolute HTTP and HTTPS URLs", () => {
  assert.equal(
    normalizeBlogInput({ canonicalUrl: "  https://example.com/blog?a=1&b=2  " }, {
      partial: true,
    }).canonicalUrl,
    "https://example.com/blog?a=1&b=2",
  );
  assert.equal(
    normalizeBlogInput({ canonicalUrl: " http://example.com/article " }, {
      partial: true,
    }).canonicalUrl,
    "http://example.com/article",
  );
});

test("canonical URLs reject malformed, relative, and unsupported-protocol values", () => {
  for (const canonicalUrl of [
    "example.com/article",
    "https://",
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "file:///article.html",
    "undefined",
    "null",
  ]) {
    assert.throws(
      () => normalizeBlogInput({ canonicalUrl }, { partial: true }),
      /Canonical URL must be an HTTP or HTTPS URL/,
      canonicalUrl,
    );
  }
});

test("draft and publish validation do not require a canonical URL", async () => {
  const data = normalizeBlogInput({
    title: "Gajak guide",
    slug: "gajak-guide",
    excerpt: "A helpful guide",
    content: "<p>Article content</p>",
    category: "Gajak Guide",
    canonicalUrl: "   ",
  });
  const article = new BlogArticle({
    ...data,
    createdBy: "507f1f77bcf86cd799439011",
    updatedBy: "507f1f77bcf86cd799439011",
  });

  assert.equal(article.canonicalUrl, null);
  assert.equal(await article.validate(), undefined);
  assert.doesNotThrow(() => validatePublishContent(article));
});

test("editing title regenerates slug unless an explicit slug is supplied", () => {
  assert.equal(
    normalizeBlogInput({ title: "Fresh Gajak" }, { partial: true }).slug,
    "fresh-gajak",
  );
  assert.equal(
    normalizeBlogInput(
      { title: "Fresh Gajak", slug: "custom-url" },
      { partial: true },
    ).slug,
    "custom-url",
  );
  assert.equal(slugify("Crème brûlée"), "creme-brulee");
});

test("publishing requires completed public article fields", () => {
  assert.throws(
    () => validatePublishContent({ title: "Draft", category: "Gajak" }),
    /required before publishing/,
  );
  assert.throws(
    () =>
      validatePublishContent({
        title: "Empty",
        excerpt: "Intro",
        content: "<p><br></p>",
        category: "Gajak",
      }),
    /required before publishing/,
  );
  assert.doesNotThrow(
    () =>
      validatePublishContent({
        title: "Ready",
        excerpt: "Intro",
        content: "<p>Body</p>",
        category: "Gajak",
      }),
  );
});

test("blog model indexes unique slugs and publication queries", async () => {
  const indexes = BlogArticle.schema.indexes();
  assert.ok(indexes.some(([index, options]) => index.slug === 1 && options.unique));
  assert.ok(indexes.some(([index]) => index.status === 1 && index.publishedAt === -1));

  const validDraft = new BlogArticle({
    title: "Draft article",
    slug: "draft-article",
    category: "Gajak Guide",
    createdBy: "507f1f77bcf86cd799439011",
    updatedBy: "507f1f77bcf86cd799439011",
  });
  assert.equal(validDraft.status, "draft");
  assert.equal(validDraft.publishedAt, null);
  assert.equal(validDraft.canonicalUrl, null);
  assert.equal(await validDraft.validate(), undefined);
});

test("initial blog seed contains six unique complete articles and no publish status", () => {
  assert.equal(initialArticles.length, 6);
  assert.equal(new Set(initialArticles.map((article) => article.slug)).size, 6);
  for (const article of initialArticles) {
    assert.ok(article.title && article.excerpt && article.category && article.content);
    assert.equal(article.status, undefined);
    assert.equal(article.publishedAt, undefined);
  }
});
