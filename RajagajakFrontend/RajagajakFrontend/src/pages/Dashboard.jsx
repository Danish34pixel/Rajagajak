import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "../components/Navbar.jsx";
import * as api from "../services/api.js";

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut", staggerChildren: 0.1 },
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

export default function Dashboard() {
  const [coupons, setCoupons] = useState([]);
  const [couponsError, setCouponsError] = useState("");
  const [code, setCode] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [applied, setApplied] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [products, setProducts] = useState([]);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  const loadCoupons = () => {
    setCouponsError("");
    api
      .activeCoupons()
      .then((response) => setCoupons(response.data))
      .catch(() => setCouponsError("Unable to load coupons."));
  };

  const loadProducts = () => {
    setProductsLoading(true);
    setProductsError("");
    api
      .products()
      .then((response) => setProducts(response.data))
      .catch(() =>
        setProductsError("Unable to load products. Please try again."),
      )
      .finally(() => setProductsLoading(false));
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  useEffect(() => {
    loadProducts();
  }, []);

  const apply = async (event) => {
    event.preventDefault();
    setCouponError("");

    const trimmedCode = code.trim();
    const parsedSubtotal = Number(subtotal);

    if (!trimmedCode) {
      setApplied(null);
      setCouponError("Enter a coupon code.");
      return;
    }
    if (
      subtotal === "" ||
      Number.isNaN(parsedSubtotal) ||
      parsedSubtotal <= 0
    ) {
      setApplied(null);
      setCouponError("Enter a valid cart subtotal.");
      return;
    }

    try {
      const response = await api.applyCoupon(trimmedCode, parsedSubtotal);
      setApplied(response.data);
    } catch (error) {
      setApplied(null);
      setCouponError(error.message || "Unable to apply coupon.");
    }
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    if (!normalizedSearch) return products;
    return products.filter((item) => {
      const haystack = [item.title, ...(item.bulletPoints || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [products, normalizedSearch]);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard">
        <motion.div
          className="page-heading"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <div>
            <span className="eyebrow">Fresh from Rajagajak</span>
            <h1>Explore our products.</h1>
            <p>Find something useful for your everyday needs.</p>
          </div>
        </motion.div>
        <motion.section
          className="products-section"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="section-heading">
            <div>
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
              </motion.span>{" "}
              Refresh
            </button>
          </div>
          <label className="product-search">
            <Search size={18} aria-hidden="true" />
            <span className="visually-hidden">Search products</span>
            <input
              type="search"
              placeholder="Search products"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <AnimatePresence mode="wait">
            {productsLoading && (
              <motion.div
                className="product-grid"
                key="product-skeletons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="product-skeleton" />
                <div className="product-skeleton" />
                <div className="product-skeleton" />
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
                    const bulletPoints = item.bulletPoints || [];
                    return (
                      <motion.article
                        className={`product-card product-card-expand ${
                          expandedProductId === item._id ? "is-expanded" : ""
                        }`}
                        key={item._id}
                        variants={itemVariants}
                        style={{ "--product-accent": "var(--green)" }}
                        onClick={() =>
                          setExpandedProductId((currentId) =>
                            currentId === item._id ? null : item._id,
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setExpandedProductId((currentId) =>
                              currentId === item._id ? null : item._id,
                            );
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-expanded={expandedProductId === item._id}
                      >
                        <div className="product-card-image product-card-circle">
                          {images[0] ? (
                            <img src={images[0]} alt={item.title} />
                          ) : (
                            <span>No image</span>
                          )}
                        </div>
                        <div className="product-card-copy">
                          <h3>{item.title}</h3>
                          <p className="product-card-description">
                            {bulletPoints.join(" ") ||
                              "Explore this product from Rajagajak."}
                          </p>
                          <div className="product-price">
                            <del>₹{item.mrp}/kg</del>
                            <span>{item.discount}% OFF</span>
                            <strong>₹{item.finalPrice}/kg</strong>
                          </div>
                          {bulletPoints.length > 0 && (
                            <ul>
                              {bulletPoints.slice(0, 3).map((point) => (
                                <li key={point}>{point}</li>
                              ))}
                            </ul>
                          )}
                          <Link
                            className="secondary-action"
                            to={`/products/${item._id}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            View details
                          </Link>
                        </div>
                      </motion.article>
                    );
                  })}
                </motion.div>
              )}
          </AnimatePresence>
        </motion.section>
        <motion.section
          className="offer-section"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Member offers</span>
              <h2>Available coupons</h2>
            </div>
          </div>
          {couponsError ? (
            <div className="alert">
              {couponsError}
              <button
                className="retry-button"
                type="button"
                onClick={loadCoupons}
              >
                Retry
              </button>
            </div>
          ) : coupons.length === 0 ? (
            <p className="section-subtitle">No active offers right now.</p>
          ) : (
            coupons.map((coupon) => (
              <motion.article
                className="offer-row"
                key={coupon._id}
                variants={itemVariants}
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 14px 26px rgba(105, 45, 22, 0.12)",
                }}
              >
                <div>
                  <strong>
                    🔥 {coupon.code} · {coupon.title}
                  </strong>
                  <span>
                    {coupon.description ||
                      `${coupon.discountValue}${coupon.discountType === "percentage" ? "% OFF" : "₹ OFF"}`}{" "}
                    · Minimum order: ₹{coupon.minimumOrderValue}
                  </span>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setCode(coupon.code);
                    setCouponError("");
                  }}
                >
                  Use code
                </motion.button>
              </motion.article>
            ))
          )}
          <form className="coupon-form" onSubmit={apply}>
            <input
              placeholder="Coupon code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
            <input
              type="number"
              min="0"
              placeholder="Cart subtotal"
              value={subtotal}
              onChange={(event) => setSubtotal(event.target.value)}
            />
            <button className="primary-button" type="submit">
              Apply coupon
            </button>
          </form>
          <AnimatePresence mode="wait">
            {couponError && (
              <motion.div
                className="alert"
                key="coupon-error"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: "spring", stiffness: 280, damping: 20 },
                }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
              >
                {couponError}
              </motion.div>
            )}
            {applied && (
              <motion.div
                className="success-note"
                key="coupon-success"
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: "spring", stiffness: 260, damping: 18 },
                }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
              >
                {applied.coupon} applied: ₹{applied.discount} off. Pay ₹
                {applied.finalTotal}.
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </main>
    </div>
  );
}
