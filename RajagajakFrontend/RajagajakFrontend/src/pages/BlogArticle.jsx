import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { formatPublicationDate } from "../data/blogArticles.js";
import * as api from "../services/api.js";
import renderSafeArticleContent from "../utils/renderSafeArticleContent.js";
import usePageMetadata from "../utils/usePageMetadata.js";
import "./Blog.css";

const DEFAULT_TITLE = "Blog Article | RAJA GAJAK®";
const DEFAULT_DESCRIPTION =
  "Read stories and practical guides about gajak and traditional Indian sweets from RAJA GAJAK®.";
const FALLBACK_IMAGE = "/blog/gajak-guide.svg";

function RelatedCard({ article }) {
  const image = article.featuredImage || article.image || FALLBACK_IMAGE;
  return (
    <article className="blog-related-card">
      <Link
        to={`/blog/${article.slug}`}
        className="blog-related-image"
        aria-label={`Read ${article.title}`}
        tabIndex={-1}
      >
        <img
          src={image}
          alt={article.imageAlt || article.title}
          loading="lazy"
        />
      </Link>
      <div>
        <span className="blog-category">{article.category}</span>
        <h3>
          <Link to={`/blog/${article.slug}`}>{article.title}</Link>
        </h3>
        <Link className="blog-read-link" to={`/blog/${article.slug}`}>
          Read article <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default function BlogArticle() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [relatedError, setRelatedError] = useState("");

  useEffect(() => {
    let active = true;
    setArticle(null);
    setRelatedArticles([]);
    setLoading(true);
    setNotFound(false);
    setError("");
    setRelatedError("");
    api
      .publicBlogArticle(slug)
      .then(async (response) => {
        const fetchedArticle = response.data;
        if (!fetchedArticle) {
          setNotFound(true);
          return;
        }
        if (!active) return;
        setArticle(fetchedArticle);
        try {
          const related = await api.publicBlogArticles({
            category: fetchedArticle.category,
            limit: 4,
          });
          if (active) {
            setRelatedArticles(
              (related.data || [])
                .filter((item) => item.slug !== fetchedArticle.slug)
                .slice(0, 3),
            );
          }
        } catch {
          if (active) {
            setRelatedArticles([]);
            setRelatedError("Related articles are temporarily unavailable.");
          }
        }
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 404) setNotFound(true);
        else setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  usePageMetadata({
    title: article
      ? article.seoTitle || `${article.title} | RAJA GAJAK®`
      : DEFAULT_TITLE,
    description: article?.metaDescription || DEFAULT_DESCRIPTION,
    type: "article",
    image: article?.featuredImage || article?.image || FALLBACK_IMAGE,
    canonicalUrl: article?.canonicalUrl,
  });

  const image = article?.featuredImage || article?.image || FALLBACK_IMAGE;

  return (
    <div className="app-shell blog-page">
      <Navbar />
      <main className="blog-main blog-article-main">
        {loading ? (
          <div className="blog-loading" role="status">Loading article…</div>
        ) : error ? (
          <section className="blog-not-found" role="alert">
            <span className="eyebrow">Unable to load this article</span>
            <h1>Something went wrong</h1>
            <p>{error}</p>
            <Link className="blog-shop-link" to="/blog">
              <ArrowLeft size={16} aria-hidden="true" /> Back to Blog
            </Link>
          </section>
        ) : notFound || !article ? (
          <section className="blog-not-found">
            <span className="eyebrow">A missing page</span>
            <h1>We couldn&apos;t find that article</h1>
            <p>
              The link may be out of date, or the article may have moved. Browse
              the blog to find another story.
            </p>
            <Link className="blog-shop-link" to="/blog">
              <ArrowLeft size={16} aria-hidden="true" /> Back to Blog
            </Link>
          </section>
        ) : (
          <>
            <Link className="blog-back-link" to="/blog">
              <ArrowLeft size={16} aria-hidden="true" /> Back to Blog
            </Link>
            <article className="blog-article">
              <header className="blog-article-header">
                <span className="blog-category">{article.category}</span>
                <h1>{article.title}</h1>
                <div className="blog-article-byline">
                  {article.author && <span>By {article.author}</span>}
                  {article.publishedAt && (
                    <time dateTime={article.publishedAt}>
                      {formatPublicationDate(article.publishedAt)}
                    </time>
                  )}
                </div>
              </header>
              <figure className="blog-article-figure">
                <img
                  src={image}
                  alt={article.imageAlt || article.title}
                  width="800"
                  height="480"
                />
              </figure>
              <div className="blog-article-content">
                {article.excerpt && (
                  <p className="blog-article-intro">{article.excerpt}</p>
                )}
                {article.content ? (
                  <div className="blog-article-html">
                    {renderSafeArticleContent(article.content)}
                  </div>
                ) : (article.sections || []).map((section) => (
                  <section key={section.heading}>
                    <h2>{section.heading}</h2>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.list && (
                      <ul>
                        {section.list.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                    {section.link && (
                      <p className="blog-inline-link">
                        <Link to={section.link.href}>
                          {section.link.label}{" "}
                          <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </p>
                    )}
                  </section>
                ))}
              </div>
            </article>
            <section className="blog-related" aria-labelledby="related-heading">
              <div className="blog-related-heading">
                <div>
                  <span className="eyebrow">Keep exploring</span>
                  <h2 id="related-heading">Related articles</h2>
                </div>
                <Link className="blog-read-link" to="/blog">
                  All articles <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
              <div className="blog-related-grid">
                {relatedArticles.map((related) => (
                  <RelatedCard article={related} key={related.slug} />
                ))}
              </div>
              {relatedError && <p className="blog-related-error">{relatedError}</p>}
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
