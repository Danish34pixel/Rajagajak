import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  DEFAULT_QUANTITY_KG,
  formatQuantity,
  MIN_QUANTITY_KG,
  getSelectableMaxStockKg,
} from "../utils/quantity.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function ProductCard({ item, onAddToCart, variants }) {
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
  const canAddToCart =
    !Number.isFinite(Number(item.stock)) ||
    getSelectableMaxStockKg(item.stock) >= MIN_QUANTITY_KG;
  const productId = item._id || item.id;

  return (
    <motion.article
      className="product-card modern-product-card"
      variants={variants}
      whileHover={{ y: -4 }}
    >
      <div className="product-card-media">
        {images[0] ? (
          <img src={images[0]} alt={item.title} />
        ) : (
          <div className="product-fallback">No image</div>
        )}
        {Number(item.discount || 0) > 0 && (
          <span className="product-badge">{item.discount}% OFF</span>
        )}
      </div>

      <div className="product-card-body">
        <div className="product-card-meta">
          <span>{item.category || "Everyday essentials"}</span>
        </div>
        <h3>{item.title}</h3>
        <p className="product-card-description">{description}</p>

        <div className="product-card-pricing">
          <div className="price-stack">
            <del>{money(mrpPerKg)}/kg</del>
            <strong>{money(pricePerKg)}/kg</strong>
          </div>
          <p className="product-card-description">
            {formatQuantity(DEFAULT_QUANTITY_KG)}:{" "}
            {money(pricePerKg * DEFAULT_QUANTITY_KG)}
          </p>
          {Number(item.discount || 0) > 0 && (
            <span className="discount-tag">{item.discount}% OFF</span>
          )}
        </div>

        {bulletPoints.length > 0 && (
          <ul className="product-points">
            {bulletPoints.slice(0, 3).map((point) => (
              <li key={`${productId}-${point}`}>{point}</li>
            ))}
          </ul>
        )}

        <div className="product-card-actions">
          <Link
            className="secondary-action"
            to={`/products/${productId}`}
            onClick={(event) => event.stopPropagation()}
          >
            View Details
            <ArrowRight size={14} />
          </Link>
          <button
            type="button"
            className="primary-button product-cart-button"
            disabled={!canAddToCart}
            onClick={(event) => {
              event.stopPropagation();
              onAddToCart(item, event);
            }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </motion.article>
  );
}
