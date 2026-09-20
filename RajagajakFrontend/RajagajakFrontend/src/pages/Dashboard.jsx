import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/useCart.js";
import * as api from "../services/api.js";

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

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function Dashboard() {
  const { addToCart } = useCart();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [cartMessage, setCartMessage] = useState("");

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const loadProducts = () => {
    setProductsLoading(true);
    setProductsError("");
    api
      .products()
      .then((response) => setProducts(response.data || []))
      .catch(() =>
        setProductsError("Unable to load products. Please try again."),
      )
      .finally(() => setProductsLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const unique = new Set();
    products.forEach((product) => {
      const category = String(product.category || "").trim();
      if (category) unique.add(category);
    });
    return ["All", ...Array.from(unique)];
  }, [products]);

  const handleAddToCart = (item) => {
    addToCart(item, 1);
    setCartMessage(`${item.title} was added to your cart.`);
    window.clearTimeout(handleAddToCart.timeout);
    handleAddToCart.timeout = window.setTimeout(() => setCartMessage(""), 2200);
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    let nextProducts = [...products];

    if (selectedCategory !== "All") {
      nextProducts = nextProducts.filter(
        (item) => String(item.category || "").trim() === selectedCategory,
      );
    }

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
  }, [products, normalizedSearch, selectedCategory, sortBy]);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard ecommerce-dashboard">
        <motion.section
          className="hero-section"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.48, ease: "easeOut" }}
          >
            <span className="eyebrow">Fresh at Rajagajak</span>
            <h1>Fresh products at the best prices</h1>
            <p>
              Discover pantry essentials, daily groceries, and trusted staples
              delivered with freshness and value you can count on.
            </p>
            <div className="hero-actions">
              <a
                href="#products-section"
                className="primary-button hero-button"
              >
                Shop now
              </a>
              <Link className="secondary-link" to="/bag">
                View cart
              </Link>
            </div>
          </motion.div>
          <motion.div
            className="hero-highlight"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <span className="hero-badge">Today&apos;s fresh picks</span>
            <h3>Best value basket</h3>
            <div className="mini-stat">
              <strong>UP TO 25% OFF</strong>
              <span>On daily essentials</span>
            </div>
            <div className="mini-stat">
              <strong>1 KG</strong>
              <span>To 10 KG choices</span>
            </div>
          </motion.div>
        </motion.section>

        <motion.section
          className="category-section"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">Quick filters</span>
              <h2>Shop by category</h2>
            </div>
            <SlidersHorizontal size={16} aria-hidden="true" />
          </div>
          <div className="category-scroll" aria-label="Product categories">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`category-pill ${selectedCategory === category ? "active" : ""}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="products-section"
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
                  {filteredProducts.map((item) => {
                    const images = item.images?.length
                      ? item.images
                      : item.image
                        ? [item.image]
                        : [];
                    const bulletPoints = Array.isArray(item.bulletPoints)
                      ? item.bulletPoints
                      : [];
                    const description =
                      item.description ||
                      bulletPoints.join(" ") ||
                      "Explore this product from Rajagajak.";
                    const pricePerKg = Number(
                      item.finalPrice ?? item.pricePerKg ?? item.price ?? 0,
                    );
                    const mrpPerKg = Number(
                      item.mrp ??
                        item.mrpPerKg ??
                        item.pricePerKg ??
                        pricePerKg ??
                        0,
                    );

                    return (
                      <motion.article
                        className="product-card modern-product-card"
                        key={item._id}
                        variants={itemVariants}
                        whileHover={{ y: -4 }}
                      >
                        <div className="product-card-media">
                          {images[0] ? (
                            <img src={images[0]} alt={item.title} />
                          ) : (
                            <div className="product-fallback">No image</div>
                          )}
                          {Number(item.discount || 0) > 0 && (
                            <span className="product-badge">
                              {item.discount}% OFF
                            </span>
                          )}
                        </div>

                        <div className="product-card-body">
                          <div className="product-card-meta">
                            <span>
                              {item.category || "Everyday essentials"}
                            </span>
                          </div>
                          <h3>{item.title}</h3>
                          <p className="product-card-description">
                            {description}
                          </p>

                          <div className="product-card-pricing">
                            <div className="price-stack">
                              <del>{money(mrpPerKg)}/kg</del>
                              <strong>{money(pricePerKg)}/kg</strong>
                            </div>
                            {Number(item.discount || 0) > 0 && (
                              <span className="discount-tag">
                                {item.discount}% OFF
                              </span>
                            )}
                          </div>

                          {bulletPoints.length > 0 && (
                            <ul className="product-points">
                              {bulletPoints.slice(0, 3).map((point) => (
                                <li key={`${item._id}-${point}`}>{point}</li>
                              ))}
                            </ul>
                          )}

                          <div className="product-card-actions">
                            <Link
                              className="secondary-action"
                              to={`/products/${item._id}`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              View Details
                              <ArrowRight size={14} />
                            </Link>
                            <button
                              type="button"
                              className="primary-button product-cart-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleAddToCart(item);
                              }}
                            >
                              Add to Cart
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </motion.div>
              )}
          </AnimatePresence>
        </motion.section>
      </main>
    </div>
  );
}
