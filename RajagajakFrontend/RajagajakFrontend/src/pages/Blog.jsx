import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { blogCategories, formatPublicationDate } from "../data/blogArticles.js";
import * as api from "../services/api.js";
import usePageMetadata from "../utils/usePageMetadata.js";
import "./Blog.css";

const LISTING_TITLE =
  "RAJA GAJAK® Blog – Gajak, Traditional Sweets & More";
const LISTING_DESCRIPTION =
  "Discover the rich traditions of Indian sweets, explore different varieties of gajak, learn about traditional ingredients, and find helpful guides to choosing and enjoying authentic sweets from RAJA GAJAK® in Bhopal.";

function ArticleCard({ article }) {
  const image = article.featuredImage || article.image;
  return (
    <article className="blog-card">
      <Link
        className="blog-card-image-link"
        to={`/blog/${article.slug}`}
        aria-label={`Read ${article.title}`}
        tabIndex={-1}
      >
        <img
          className="blog-card-image"
          src={image}
          alt={article.imageAlt || article.title}
          loading="lazy"
          width="800"
          height="480"
        />
      </Link>
      <div className="blog-card-body">
        <div className="blog-card-meta">
          <span className="blog-category">{article.category}</span>
          <time dateTime={article.publishedAt}>
            {formatPublicationDate(article.publishedAt)}
          </time>
        </div>
        <h2>
          <Link to={`/blog/${article.slug}`}>{article.title}</Link>
        </h2>
        <p>{article.excerpt}</p>
        <Link className="blog-read-link" to={`/blog/${article.slug}`}>
          Read More <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default function Blog() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();

  usePageMetadata({
    title: LISTING_TITLE,
    description: LISTING_DESCRIPTION,
    image: "/blog/gajak-guide.svg",
  });

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      setPage(1);
      api
        .publicBlogArticles({
          q: normalizedQuery,
          category: activeCategory === "All" ? "" : activeCategory,
          page: 1,
          limit: 6,
        })
        .then((response) => {
          if (!active) return;
          setArticles(response.data || []);
          setHasMore(
            response.pagination?.page < response.pagination?.pages,
          );
          setLoading(false);
        })
        .catch((requestError) => {
          if (!active) return;
          setError(requestError.message);
          setArticles([]);
          setHasMore(false);
          setLoading(false);
        });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [activeCategory, normalizedQuery, retryCount]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const nextPage = page + 1;
      const response = await api.publicBlogArticles({
        q: normalizedQuery,
        category: activeCategory === "All" ? "" : activeCategory,
        page: nextPage,
        limit: 6,
      });
      setArticles((current) => [...current, ...(response.data || [])]);
      setPage(nextPage);
      setHasMore(
        response.pagination?.page < response.pagination?.pages,
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const isDefaultView = !normalizedQuery && activeCategory === "All";
  const featuredArticle = isDefaultView ? articles[0] : null;
  const articlesToShow = featuredArticle ? articles.slice(1) : articles;
  const noArticles = !loading && !error && articles.length === 0;

  return (
    <div className="app-shell blog-page">
      <Navbar />
      <main className="blog-main">
        <header className="blog-hero">
          <div className="blog-hero-copy">
            <span className="eyebrow">Stories, ingredients &amp; tradition</span>
            <h1>{LISTING_TITLE}</h1>
            <p>{LISTING_DESCRIPTION}</p>
            <Link className="blog-shop-link" to="/#products-section">
              Explore the shop <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="blog-hero-art" aria-hidden="true">
            <img src="/blog/gajak-guide.svg" alt="" width="800" height="480" />
            <span className="blog-hero-art-note">
              <BookOpen size={15} aria-hidden="true" />
              Notes from the sweet table
            </span>
          </div>
        </header>

        {featuredArticle && (
          <section className="blog-featured" aria-labelledby="featured-title">
            <Link
              className="blog-featured-image-link"
              to={`/blog/${featuredArticle.slug}`}
              tabIndex={-1}
              aria-label={`Read ${featuredArticle.title}`}
            >
              <img
              src={featuredArticle.featuredImage || featuredArticle.image}
              alt={featuredArticle.imageAlt || featuredArticle.title}
                width="800"
                height="480"
              />
            </Link>
            <div className="blog-featured-copy">
              <span className="blog-featured-label">Featured story</span>
              <div className="blog-card-meta">
                <span className="blog-category">{featuredArticle.category}</span>
                <time dateTime={featuredArticle.publishedAt}>
                  {formatPublicationDate(featuredArticle.publishedAt)}
                </time>
              </div>
              <h2 id="featured-title">{featuredArticle.title}</h2>
              <p>{featuredArticle.excerpt}</p>
              <Link
                className="blog-read-link"
                to={`/blog/${featuredArticle.slug}`}
              >
                Read More <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </section>
        )}

        <section className="blog-library" aria-labelledby="blog-library-title">
          <div className="blog-library-heading">
            <div>
              <span className="eyebrow">From our kitchen notebook</span>
              <h2 id="blog-library-title">Explore the blog</h2>
            </div>
            <label className="blog-search">
              <Search size={17} aria-hidden="true" />
              <span className="visually-hidden">Search blog articles</span>
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                placeholder="Search articles"
                aria-label="Search blog articles"
              />
            </label>
          </div>

          <div className="blog-filters" aria-label="Filter articles by category">
            {["All", ...blogCategories].map((category) => (
              <button
                className={`blog-filter ${activeCategory === category ? "active" : ""}`}
                type="button"
                key={category}
                aria-pressed={activeCategory === category}
                onClick={() => {
                  setActiveCategory(category);
                }}
              >
                {category}
              </button>
            ))}
          </div>

          {error && (
            <div className="alert blog-error" role="alert">
              {error}
              <button
                className="retry-button"
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
              >
                Retry
              </button>
            </div>
          )}
          {loading && articles.length === 0 ? (
            <p className="blog-loading" role="status">Loading articles…</p>
          ) : noArticles ? (
            <div className="blog-empty" role="status">
              <Search size={24} aria-hidden="true" />
              <h3>No articles found</h3>
              <p>
                Try a different search or choose another category to explore
                more stories.
              </p>
              <button
                className="blog-reset-button"
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveCategory("All");
                }}
              >
                Clear search and filters
              </button>
            </div>
          ) : (
            <>
              <div className="blog-card-grid">
                {articlesToShow.map((article) => (
                  <ArticleCard article={article} key={article.slug} />
                ))}
              </div>
              {hasMore && (
                <button
                  className="blog-load-more"
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading…" : "Load more articles"}
                </button>
              )}
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
