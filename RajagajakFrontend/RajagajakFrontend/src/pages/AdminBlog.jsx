import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Eye,
  FileText,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import ImageExtension from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { useAuth } from "../context/useAuth.js";
import Navbar from "../components/Navbar.jsx";
import * as api from "../services/api.js";
import { blogCategories } from "../data/blogArticles.js";
import renderSafeArticleContent from "../utils/renderSafeArticleContent.js";
import "./AdminBlog.css";

const blankArticle = (author = "") => ({
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: blogCategories[0],
  author,
  featuredImage: "",
  imageAlt: "",
  seoTitle: "",
  metaDescription: "",
  focusKeyword: "",
  canonicalUrl: "",
});

const toDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN") : "—";

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const normalizeCanonicalUrl = (value) => {
  const canonicalUrl = typeof value === "string" ? value.trim() : "";
  if (!canonicalUrl) return null;

  let parsed;
  try {
    parsed = new URL(canonicalUrl);
  } catch {
    throw new Error("Canonical URL must be an absolute HTTP or HTTPS URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error("Canonical URL must be an absolute HTTP or HTTPS URL.");
  }
  return canonicalUrl;
};

export default function AdminBlog() {
  const location = useLocation();
  const navigate = useNavigate();
  const id =
    location.pathname.match(/^\/admin\/blog\/([^/]+)\/edit$/)?.[1] || null;
  const { user } = useAuth();
  const isEditor = location.pathname.endsWith("/new") || Boolean(id);
  const [articles, setArticles] = useState([]);
  const [article, setArticle] = useState(() => blankArticle(user?.name || ""));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [preview, setPreview] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [content, setContent] = useState("");
  const [contentRevision, setContentRevision] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    scheduled: 0,
  });
  const imageInputRef = useRef(null);
  const listRequestRef = useRef(0);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
      }),
      LinkExtension.configure({ openOnClick: false }),
      ImageExtension.configure({ allowBase64: false }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "admin-rich-content",
        role: "textbox",
        "aria-label": "Article content",
        "aria-labelledby": "blog-article-content-label",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const next = currentEditor.getHTML();
      setContent(next);
      setArticle((current) => ({ ...current, content: next }));
      setDirty(true);
    },
  });

  const loadArticles = useCallback(async ({ pageToLoad = 1, append = false } = {}) => {
    const requestId = ++listRequestRef.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const response = await api.adminBlogArticles({
        page: pageToLoad,
        limit: 20,
        status: statusFilter === "all" ? "" : statusFilter,
        category: categoryFilter === "all" ? "" : categoryFilter,
        q: query.trim(),
      });
      if (requestId !== listRequestRef.current) return;
      setArticles((current) =>
        append ? [...current, ...(response.data || [])] : response.data || [],
      );
      setPage(response.pagination?.page || pageToLoad);
      setPages(response.pagination?.pages || 1);
      setStatusCounts(
        response.pagination?.stats || {
          total: 0,
          published: 0,
          drafts: 0,
          scheduled: 0,
        },
      );
    } catch (requestError) {
      if (requestId === listRequestRef.current) setError(requestError.message);
    } finally {
      if (requestId === listRequestRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [categoryFilter, query, statusFilter]);

  useEffect(() => {
    if (isEditor) return undefined;
    const timer = window.setTimeout(() => loadArticles(), 180);
    return () => {
      window.clearTimeout(timer);
      listRequestRef.current += 1;
    };
  }, [isEditor, loadArticles]);

  useEffect(() => {
    if (!isEditor) return;
    if (!id) {
      setArticle(blankArticle(user?.name || ""));
      setContent("");
      setContentRevision((current) => current + 1);
      setSlugEdited(false);
      setDirty(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    api
      .adminBlogArticle(id)
      .then((response) => {
        const existing = response.data;
        if (!existing) throw new Error("Article not found.");
        if (!active) return;
        setArticle({
          ...blankArticle(user?.name || ""),
          ...existing,
        });
        setContent(existing.content || "");
        setContentRevision((current) => current + 1);
        setSlugEdited(true);
        setDirty(false);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isEditor, id, user?.name]);

  useEffect(() => {
    if (editor) editor.commands.setContent(content, { emitUpdate: false });
  }, [contentRevision, editor]);

  useEffect(() => {
    if (!dirty) return undefined;
    const confirmLeave = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", confirmLeave);
    return () => window.removeEventListener("beforeunload", confirmLeave);
  }, [dirty]);

  const updateField = (field, value) => {
    setDirty(true);
    if (field === "slug") setSlugEdited(true);
    setArticle((current) => {
      const updated = { ...current, [field]: value };
      if (field === "title" && !slugEdited) updated.slug = slugify(value);
      return updated;
    });
  };

  const addArticleLink = () => {
    if (!editor) return;
    const currentHref = editor.getAttributes("link").href || "https://";
    const href = window.prompt("Enter a link URL", currentHref);
    if (href === null) return;
    if (href.trim()) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: href.trim() })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("The image must be 10 MB or smaller.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const response = await api.uploadBlogImage(file);
      const imageUrl = response.data?.url;
      if (!imageUrl) throw new Error("The upload did not return an image URL.");
      if (imageInputRef.current?.dataset.mode === "content") {
        const imageAlt = window.prompt(
          "Describe this image for screen reader users",
          article.imageAlt || article.title,
        );
        if (imageAlt !== null) {
          editor
            ?.chain()
            .focus()
            .setImage({ src: imageUrl, alt: imageAlt.trim() || article.title })
            .run();
        }
      } else {
        updateField("featuredImage", imageUrl);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (status) => {
    if (!article.title.trim() || !article.slug.trim() || !article.excerpt.trim()) {
      setError("Title, slug, and excerpt are required.");
      return;
    }
    if (!article.content.trim()) {
      setError("Add the article content before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...article,
        content,
        canonicalUrl: normalizeCanonicalUrl(article.canonicalUrl),
        status,
        publishedAt:
          status === "published"
            ? article.publishedAt || new Date().toISOString()
            : article.publishedAt || null,
      };
      const response = id
        ? await api.updateBlogArticle(id, payload)
        : await api.createBlogArticle(payload);
      const saved = response.data;
      if (status === "published" && saved?._id) {
        await api.publishBlogArticle(saved._id);
      }
      setDirty(false);
      setNotice(status === "published" ? "Article published." : "Draft saved.");
      navigate("/admin/blog");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const removeArticle = async (item) => {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    try {
      await api.deleteBlogArticle(item._id);
      setNotice("Article deleted.");
      await loadArticles();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const togglePublished = async (item) => {
    try {
      if (item.status === "published") {
        await api.unpublishBlogArticle(item._id);
        setNotice("Article unpublished.");
      } else {
        await api.publishBlogArticle(item._id);
        setNotice("Article published.");
      }
      await loadArticles();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const cancelEditor = () => {
    if (
      dirty &&
      !window.confirm("Discard your unsaved changes and leave this editor?")
    ) {
      return;
    }
    setDirty(false);
    navigate("/admin/blog");
  };

  const statusLabel = (status) =>
    status ? `${status[0].toUpperCase()}${status.slice(1)}` : "Draft";

  return (
    <div
      className="app-shell admin-blog-page"
      onClickCapture={(event) => {
        const anchor = event.target.closest("a[href]");
        if (!isEditor || !dirty || !anchor) return;
        if (!window.confirm("Leave without saving your changes?")) {
          event.preventDefault();
          event.stopPropagation();
        } else {
          setDirty(false);
        }
      }}
    >
      <Navbar admin />
      <main className="dashboard admin-blog-main">
        <header className="admin-blog-heading">
          <div>
            <span className="eyebrow">Content management</span>
            <h1>Blog &amp; Content</h1>
            <p>Create, edit, and publish articles for the RAJA GAJAK® blog.</p>
          </div>
          {!isEditor && (
            <Link className="primary-button admin-blog-create" to="/admin/blog/new">
              <Plus size={17} aria-hidden="true" /> New article
            </Link>
          )}
        </header>
        <nav className="admin-tabs admin-blog-tabs" aria-label="Admin sections">
          <Link to="/admin/products">Products</Link>
          <Link to="/admin/coupons">Coupons</Link>
          <Link to="/admin/orders">Orders</Link>
          <Link className="active" to="/admin/blog">Blog &amp; Content</Link>
        </nav>

        {error && <div className="alert" role="alert">{error}</div>}
        {notice && <div className="success-note" role="status">{notice}</div>}

        {isEditor ? (
          loading && id ? (
            <div className="admin-blog-panel">Loading article…</div>
          ) : (
            <section className="admin-blog-editor">
              <div className="admin-blog-editor-toolbar">
                <button type="button" className="admin-blog-back" onClick={cancelEditor}>
                  <ArrowLeft size={16} aria-hidden="true" /> Back to articles
                </button>
                <div className="admin-blog-editor-actions">
                  <button
                    type="button"
                    className="admin-blog-secondary"
                    onClick={() => setPreview((current) => !current)}
                  >
                    {preview ? <X size={15} /> : <Eye size={15} aria-hidden="true" />}
                    {preview ? "Close preview" : "Preview"}
                  </button>
                  <button
                    type="button"
                    className="admin-blog-secondary"
                    disabled={saving || uploading}
                    onClick={() => save("draft")}
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    className="primary-button admin-blog-publish"
                    disabled={saving || uploading}
                    onClick={() => save("published")}
                  >
                    <Send size={15} aria-hidden="true" />
                    {saving ? "Saving…" : "Publish"}
                  </button>
                </div>
              </div>
              <form
                className="admin-blog-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  save("draft");
                }}
              >
                <div className="admin-blog-form-main">
                  <label>
                    Article title
                    <input
                      required
                      value={article.title}
                      onChange={(event) => updateField("title", event.target.value)}
                      placeholder="Write a clear, useful title"
                    />
                  </label>
                  <label>
                    URL slug
                    <input
                      required
                      value={article.slug}
                      onChange={(event) =>
                        updateField("slug", slugify(event.target.value))
                      }
                      placeholder="article-url-slug"
                    />
                  </label>
                  <label>
                    Short excerpt
                    <textarea
                      required
                      rows="3"
                      maxLength="400"
                      value={article.excerpt}
                      onChange={(event) => updateField("excerpt", event.target.value)}
                    />
                  </label>
                  <div className="admin-rich-editor">
                    <div className="admin-rich-toolbar" aria-label="Article formatting">
                      <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
                      <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
                      <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()}><strong>B</strong></button>
                      <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()}><em>I</em></button>
                      <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()}>• List</button>
                      <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</button>
                      <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>Quote</button>
                      <button type="button" disabled={!editor} onClick={addArticleLink}>Link</button>
                      <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().undo().run()} aria-label="Undo">
                        <span aria-hidden="true">↶</span>
                      </button>
                      <button type="button" disabled={!editor} onClick={() => editor?.chain().focus().redo().run()} aria-label="Redo">
                        <span aria-hidden="true">↷</span>
                      </button>
                      <button
                        type="button"
                        disabled={!editor || uploading}
                        onClick={() => {
                          if (imageInputRef.current) {
                            imageInputRef.current.dataset.mode = "content";
                            imageInputRef.current.click();
                          }
                        }}
                      >
                        <ImagePlus size={15} aria-hidden="true" /> Image
                      </button>
                    </div>
                    <label id="blog-article-content-label">Article content</label>
                    <EditorContent editor={editor} />
                    <input
                      ref={imageInputRef}
                      className="admin-blog-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={uploadImage}
                      aria-label="Upload article image"
                    />
                    {uploading && <span className="admin-blog-uploading">Uploading image…</span>}
                  </div>
                </div>

                <aside className="admin-blog-form-side">
                  <label>
                    Category
                    <select
                      value={article.category}
                      onChange={(event) => updateField("category", event.target.value)}
                    >
                      {blogCategories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Author
                    <input
                      value={article.author || ""}
                      onChange={(event) => updateField("author", event.target.value)}
                    />
                  </label>
                  <label>
                    Featured image
                    <input
                      value={article.featuredImage || ""}
                      onChange={(event) => updateField("featuredImage", event.target.value)}
                      placeholder="Image URL or upload below"
                    />
                  </label>
                  {article.featuredImage && (
                    <img
                      className="admin-blog-image-preview"
                      src={article.featuredImage}
                      alt={article.imageAlt || "Featured image preview"}
                    />
                  )}
                  <button
                    className="admin-blog-secondary admin-blog-upload-button"
                    type="button"
                    onClick={() => {
                      if (imageInputRef.current) {
                        imageInputRef.current.dataset.mode = "featured";
                        imageInputRef.current.click();
                      }
                    }}
                  >
                    <ImagePlus size={15} aria-hidden="true" />
                    {uploading ? "Uploading…" : "Upload featured image"}
                  </button>
                  <label>
                    Image alt text
                    <input
                      value={article.imageAlt || ""}
                      onChange={(event) => updateField("imageAlt", event.target.value)}
                    />
                  </label>
                  <details className="admin-blog-seo" open>
                    <summary>SEO settings</summary>
                    <label>
                      SEO title
                      <input
                        value={article.seoTitle || ""}
                        onChange={(event) => updateField("seoTitle", event.target.value)}
                      />
                    </label>
                    <label>
                      Meta description
                      <textarea
                        rows="3"
                        maxLength="320"
                        value={article.metaDescription || ""}
                        onChange={(event) =>
                          updateField("metaDescription", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Focus keyword (optional)
                      <input
                        value={article.focusKeyword || ""}
                        onChange={(event) =>
                          updateField("focusKeyword", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Canonical URL (optional)
                      <input
                        type="text"
                        inputMode="url"
                        value={article.canonicalUrl || ""}
                        onChange={(event) =>
                          updateField("canonicalUrl", event.target.value)
                        }
                        placeholder="https://example.com/your-article"
                      />
                    </label>
                  </details>
                </aside>
              </form>
              {preview && (
                <section className="admin-blog-preview">
                  <span className="eyebrow">Preview</span>
                  <h2>{article.title || "Untitled article"}</h2>
                  <p className="admin-blog-preview-excerpt">{article.excerpt}</p>
                  <div className="admin-blog-preview-content">
                    {renderSafeArticleContent(content)}
                  </div>
                </section>
              )}
            </section>
          )
        ) : (
          <>
            <section className="admin-blog-stats" aria-label="Article totals">
              <div><span>Total articles</span><strong>{statusCounts.total}</strong></div>
              <div><span>Published</span><strong>{statusCounts.published}</strong></div>
              <div><span>Drafts</span><strong>{statusCounts.drafts}</strong></div>
              <div><span>Scheduled</span><strong>{statusCounts.scheduled}</strong></div>
            </section>
            <section className="admin-blog-panel">
              <div className="admin-blog-filters">
                <label className="admin-blog-search">
                  <Search size={16} aria-hidden="true" />
                  <span className="visually-hidden">Search articles</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search title, slug, or author"
                    aria-label="Search articles"
                  />
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  aria-label="Filter by category"
                >
                  <option value="all">All categories</option>
                  {blogCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>
              {loading ? (
                <p className="admin-blog-empty">Loading articles…</p>
              ) : articles.length === 0 ? (
                <div className="admin-blog-empty">
                  <FileText size={27} aria-hidden="true" />
                  <strong>No articles to show</strong>
                  <span>Start writing a blog article for the RAJA GAJAK® website.</span>
                  <Link
                    className="primary-button admin-blog-create-first"
                    to="/admin/blog/new"
                  >
                    <Plus size={16} aria-hidden="true" /> Write your first article
                  </Link>
                </div>
              ) : (
                <div className="admin-blog-table-wrap">
                  <table className="admin-blog-table">
                    <thead>
                      <tr>
                        <th scope="col">Article</th>
                        <th scope="col">Category</th>
                        <th scope="col">Author</th>
                        <th scope="col">Published</th>
                        <th scope="col">Status</th>
                        <th scope="col">Updated</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articles.map((item) => (
                        <tr key={item._id}>
                          <td>
                            <div className="admin-blog-title-cell">
                              {item.featuredImage ? (
                                <img src={item.featuredImage} alt="" />
                              ) : (
                                <span><FileText size={17} aria-hidden="true" /></span>
                              )}
                              <strong>{item.title}</strong>
                            </div>
                          </td>
                          <td>{item.category}</td>
                          <td>{item.author || "—"}</td>
                          <td>{toDate(item.publishedAt)}</td>
                          <td><span className={`admin-blog-status ${item.status || "draft"}`}>{statusLabel(item.status)}</span></td>
                          <td>{toDate(item.updatedAt)}</td>
                          <td>
                            <div className="admin-blog-row-actions">
                              <Link to={`/admin/blog/${item._id}/edit`} aria-label={`Edit ${item.title}`} title="Edit">
                                <Pencil size={16} aria-hidden="true" />
                              </Link>
                              {item.status === "published" && (
                                <Link to={`/blog/${item.slug}`} target="_blank" rel="noreferrer" aria-label={`Preview ${item.title}`} title="Preview">
                                  <Eye size={16} aria-hidden="true" />
                                </Link>
                              )}
                              <button type="button" onClick={() => togglePublished(item)} aria-label={`${item.status === "published" ? "Unpublish" : "Publish"} ${item.title}`} title={item.status === "published" ? "Unpublish" : "Publish"}>
                                {item.status === "published" ? <X size={16} /> : <Send size={16} />}
                              </button>
                              <button type="button" onClick={() => removeArticle(item)} aria-label={`Delete ${item.title}`} title="Delete">
                                <Trash2 size={16} aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!loading && page < pages && (
                <button
                  className="admin-blog-load-more"
                  type="button"
                  onClick={() =>
                    loadArticles({ pageToLoad: page + 1, append: true })
                  }
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading…" : "Load more articles"}
                </button>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
