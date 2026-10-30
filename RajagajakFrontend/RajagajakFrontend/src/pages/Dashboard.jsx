import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "../components/Navbar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { useCart } from "../context/useCart.js";
import { useFlyToCart } from "../components/FlyToCart.jsx";
import * as api from "../services/api.js";
import { shuffleProducts } from "../utils/products.js";
import { getPageNumbers, getPageSlice } from "../utils/pagination.js";
import {
  DEFAULT_QUANTITY_KG,
  formatQuantity,
  MIN_QUANTITY_KG,
  getSelectableMaxStockKg,
} from "../utils/quantity.js";

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut", staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: "easeOut" },
  },
};

const PRODUCTS_PER_PAGE = 10;

export default function Dashboard() {
  const { addToCart } = useCart();
  const { triggerFlight } = useFlyToCart();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [sortBy, setSortBy] = useState("default");
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [pagination, setPagination] = useState({ context: "", page: 1 });
  const productsSectionRef = useRef(null);

  const loadProducts = () => {
    setProductsLoading(true);
    setProductsError("");
    setRefreshIndex((current) => current + 1);
  };

  useEffect(() => {
    let cancelled = false;
    api
      .products()
      .then((response) => {
        if (!cancelled) setProducts(response.data || []);
      })
      .catch(() => {
        if (!cancelled) {
          setProductsError("Unable to load products. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshIndex]);

  const handleAddToCart = (item, event, quantityKg = DEFAULT_QUANTITY_KG) => {
    const stock = item.stock ?? item.stockKg;
    if (
      Number.isFinite(Number(stock)) &&
      getSelectableMaxStockKg(stock) < MIN_QUANTITY_KG
    ) {
      setCartMessage("This product does not have 300 g available.");
      return;
    }
    const source = event.currentTarget
      .closest(".product-card")
      ?.querySelector(".product-card-media img");
    triggerFlight({
      source,
      imageSrc: item.images?.[0] || item.image || "",
      alt: item.title,
    });
    const added = addToCart(item, quantityKg);
    if (!added) {
      setCartMessage("Unable to add this weight. Please choose a smaller quantity.");
      return;
    }
    setCartMessage(
      `${formatQuantity(quantityKg)} of ${item.title} was added to your cart.`,
    );
    window.clearTimeout(handleAddToCart.timeout);
    handleAddToCart.timeout = window.setTimeout(() => setCartMessage(""), 2200);
  };

  const normalizedSearch = (searchParams.get("q") || "").trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    let nextProducts = [...products];

    if (normalizedSearch) {
      nextProducts = nextProducts.filter((item) => {
        const haystack = [
          item.title,
          item.category,
          item.description,
          ...(item.bulletPoints || []),
          ...(item.images || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }

    switch (sortBy) {
      case "price-low":
        nextProducts.sort(
          (a, b) => Number(a.finalPrice || 0) - Number(b.finalPrice || 0),
        );
        break;
      case "price-high":
        nextProducts.sort(
          (a, b) => Number(b.finalPrice || 0) - Number(a.finalPrice || 0),
        );
        break;
      case "discount":
        nextProducts.sort(
          (a, b) => Number(b.discount || 0) - Number(a.discount || 0),
        );
        break;
      case "name":
        nextProducts.sort((a, b) =>
          String(a.title || "").localeCompare(String(b.title || "")),
        );
        break;
      default:
        nextProducts.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
        );
        break;
    }

    return nextProducts;
  }, [products, normalizedSearch, sortBy]);
  const paginationContext = normalizedSearch;
  const requestedPage =
    pagination.context === paginationContext ? pagination.page : 1;
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const currentPage = Math.min(requestedPage, Math.max(totalPages, 1));
  const visibleProducts = useMemo(
    () => getPageSlice(filteredProducts, currentPage, PRODUCTS_PER_PAGE),
    [filteredProducts, currentPage],
  );
  const pageNumbers = getPageNumbers(totalPages, currentPage);

  const changePage = (page) => {
    setPagination({ context: paginationContext, page });
    productsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const featuredProducts = useMemo(
    () =>
      shuffleProducts(
        Array.from(
          new Map(
            products
              .filter((item) => item.images?.some(Boolean) || item.image)
              .map((item) => [
                String(item._id || item.id || item.title),
                item,
              ]),
          ).values(),
        ),
      ).slice(0, 4),
    [products],
  );
  const featuredProduct = featuredProducts.length
    ? featuredProducts[featuredIndex % featuredProducts.length]
    : null;
  const featuredImage =
    featuredProduct?.images?.find(Boolean) || featuredProduct?.image;

  useEffect(() => {
    if (featuredProducts.length < 2) return undefined;

    const intervalId = window.setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % featuredProducts.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, [featuredProducts]);

  const moveFeatured = (direction) => {
    setFeaturedIndex(
      (current) =>
        (current + direction + featuredProducts.length) %
        featuredProducts.length,
    );
  };

  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard ecommerce-dashboard">
        <motion.section
          className="featured-section"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="section-heading featured-heading">
            <div>
              <span className="eyebrow">Handpicked for you</span>
              <h1>Discover Our Favourites</h1>
            </div>
          </div>
          {productsLoading && (
            <div
              className="featured-image-skeleton"
              aria-label="Loading featured image"
            >
              <div className="product-skeleton" />
            </div>
          )}
          {productsError && (
            <div className="featured-state">
              <p>We couldn&apos;t load featured products right now.</p>
              <button className="retry-button" type="button" onClick={loadProducts}>
                Try again
              </button>
            </div>
          )}
          {!productsLoading && !productsError && products.length === 0 && (
            <p className="featured-state">Products will appear here when available.</p>
          )}
          {!productsLoading &&
            !productsError &&
            products.length > 0 &&
            !featuredProduct && (
              <p className="featured-state">
                Featured product images are not available right now.
              </p>
            )}
          {!productsLoading &&
            !productsError &&
            featuredProduct && (
            <div className="featured-image-carousel">
              <AnimatePresence mode="wait">
                <motion.div
                  className="featured-image-slide"
                  key={featuredProduct._id || featuredProduct.id}
                  initial={{ opacity: 0, scale: 1.015 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <Link
                    to={`/products/${featuredProduct._id || featuredProduct.id}`}
                    aria-label={`View ${featuredProduct.title} details`}
                  >
                    <img
                      src={featuredImage}
                      alt={featuredProduct.title}
                      loading="lazy"
                    />
                  </Link>
                </motion.div>
              </AnimatePresence>
              {featuredProducts.length > 1 && (
                <>
                  <button
                    className="featured-image-control featured-image-previous"
                    type="button"
                    aria-label="Show previous featured product image"
                    onClick={() => moveFeatured(-1)}
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    className="featured-image-control featured-image-next"
                    type="button"
                    aria-label="Show next featured product image"
                    onClick={() => moveFeatured(1)}
                  >
                    <ChevronRight size={22} />
                  </button>
                  <div
                    className="featured-image-indicators"
                    aria-label="Featured image slides"
                  >
                    {featuredProducts.map((item, index) => (
                      <button
                        key={item._id || item.id}
                        type="button"
                        className={index === featuredIndex ? "active" : ""}
                        aria-label={`Show featured product image ${index + 1}`}
                        aria-current={
                          index === featuredIndex ? "true" : undefined
                        }
                        onClick={() => setFeaturedIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            )}
        </motion.section>

        <motion.section
          id="products-section"
          ref={productsSectionRef}
          className="products-section"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Shop by KG</span>
              <h2>Products</h2>
            </div>
            <button
              className="text-action"
              type="button"
              onClick={loadProducts}
            >
              <motion.span
                animate={productsLoading ? { rotate: 360 } : { rotate: 0 }}
                transition={
                  productsLoading
                    ? { duration: 1, repeat: Infinity, ease: "linear" }
                    : { duration: 0.25 }
                }
              >
                <RefreshCw size={15} />
              </motion.span>
              Refresh
            </button>
          </div>

          <div className="products-toolbar">
            <label className="sort-select" htmlFor="sort-products">
              <span className="visually-hidden">Sort products</span>
              <select
                id="sort-products"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="default">Default</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="discount">Discount: High to Low</option>
                <option value="name">Name: A-Z</option>
              </select>
            </label>
          </div>

          {!productsLoading &&
            !productsError &&
            filteredProducts.length > 0 && (
              <p className="product-results-count" aria-live="polite">
                Showing {(currentPage - 1) * PRODUCTS_PER_PAGE + 1}–
                {Math.min(
                  currentPage * PRODUCTS_PER_PAGE,
                  filteredProducts.length,
                )}{" "}
                of {filteredProducts.length} products
              </p>
            )}

          {cartMessage && <div className="success-note">{cartMessage}</div>}

          <AnimatePresence mode="wait">
            {productsLoading && (
              <motion.div
                className="product-grid"
                key="product-skeletons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="product-skeleton" />
                ))}
              </motion.div>
            )}

            {productsError && (
              <motion.div
                className="alert"
                key="product-error"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {productsError}
                <button
                  className="retry-button"
                  type="button"
                  onClick={loadProducts}
                >
                  Retry
                </button>
              </motion.div>
            )}

            {!productsLoading && !productsError && products.length === 0 && (
              <motion.p
                className="section-subtitle"
                key="product-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                No products available right now.
              </motion.p>
            )}

            {!productsLoading &&
              !productsError &&
              products.length > 0 &&
              filteredProducts.length === 0 && (
                <motion.p
                  className="section-subtitle"
                  key="product-search-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  No products match your search.
                </motion.p>
              )}

            {!productsLoading &&
              !productsError &&
              filteredProducts.length > 0 && (
                <motion.div
                  className="product-grid"
                  key="product-grid"
                  initial="hidden"
                  animate="visible"
                  variants={sectionVariants}
                >
                  {visibleProducts.map((item) => (
                    <ProductCard
                      key={item._id || item.id}
                      item={item}
                      onAddToCart={handleAddToCart}
                      variants={itemVariants}
                    />
                  ))}
                </motion.div>
              )}
          </AnimatePresence>

          {!productsLoading && !productsError && totalPages > 1 && (
            <nav className="product-pagination" aria-label="Product pages">
              <button
                className="pagination-direction"
                type="button"
                disabled={currentPage === 1}
                onClick={() => changePage(currentPage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={17} />
                <span>Previous</span>
              </button>
              <div className="pagination-pages">
                {pageNumbers.map((page, index) =>
                  page === "ellipsis" ? (
                    <span
                      className="pagination-ellipsis"
                      key={`ellipsis-${index}`}
                      aria-hidden="true"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      className={`pagination-page ${currentPage === page ? "active" : ""}`}
                      key={page}
                      type="button"
                      aria-label={`Page ${page}`}
                      aria-current={currentPage === page ? "page" : undefined}
                      onClick={() => changePage(page)}
                    >
                      {page}
                    </button>
                  ),
                )}
              </div>
              <button
                className="pagination-direction"
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => changePage(currentPage + 1)}
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight size={17} />
              </button>
            </nav>
          )}
        </motion.section>
      </main>
      <SiteFooter />
    </div>
  );
}
