import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  DEFAULT_QUANTITY_KG,
  formatQuantity,
  getQuantityOptions,
  getSelectableMaxStockKg,
  MIN_QUANTITY_KG,
} from "../utils/quantity.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function ProductCard({ item, onAddToCart, variants }) {
  const [selectedQuantityKg, setSelectedQuantityKg] = useState(
    DEFAULT_QUANTITY_KG,
  );
  const images = item.images?.length
    ? item.images
    : item.image
      ? [item.image]
      : [];
  const description = String(item.description || "").replace(/\s+/g, " ").trim();
  const shortDescription =
    description.length > 110
      ? `${description.slice(0, 107).trimEnd()}...`
      : description;
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
  const stock = item.stock ?? item.stockKg;
  const maxStockKg = Number.isFinite(Number(stock))
    ? getSelectableMaxStockKg(stock)
    : Infinity;
  const quantityOptions = getQuantityOptions(maxStockKg);
  const canAddToCart = maxStockKg >= MIN_QUANTITY_KG;
  const productId = item._id || item.id;
  const rating = Number(item.averageRating ?? item.rating);
  const hasRating = Number.isFinite(rating) && rating > 0;
  const hasDiscount = Number(item.discount || 0) > 0 && mrpPerKg > pricePerKg;
  const selectedPrice = pricePerKg * selectedQuantityKg;
  const selectedMrp = mrpPerKg * selectedQuantityKg;

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
        {hasDiscount && (
          <span className="product-badge">{item.discount}% OFF</span>
        )}
      </div>

      <div className="product-card-body">
        <div className="product-card-meta">
          <span>{item.category || "Everyday essentials"}</span>
          {hasRating && (
            <span
              className="product-card-rating"
              aria-label={`Rated ${rating.toFixed(1)} out of 5`}
            >
              ★ {rating.toFixed(1)}
            </span>
          )}
        </div>
        <h3>{item.title}</h3>
        <p className="product-card-description">
          {shortDescription || "Available in flexible weights."}
        </p>

        <div className="product-card-pricing">
          <div className="price-stack">
            {hasDiscount && <del>{money(selectedMrp)}</del>}
            <strong>{money(selectedPrice)}</strong>
            <span>for {formatQuantity(selectedQuantityKg)}</span>
          </div>
          {hasDiscount && (
            <span className="discount-tag">{item.discount}% OFF</span>
          )}
        </div>

        <label className="product-card-quantity">
          <span>Weight</span>
          <select
            value={selectedQuantityKg}
            disabled={!canAddToCart}
            onChange={(event) =>
              setSelectedQuantityKg(Number(event.target.value))
            }
            aria-label={`Select weight for ${item.title}`}
          >
            {(quantityOptions.length
              ? quantityOptions
              : [DEFAULT_QUANTITY_KG]
            ).map((quantityKg) => (
                <option key={quantityKg} value={quantityKg}>
                  {formatQuantity(quantityKg)}
                </option>
              ))}
          </select>
        </label>

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
              onAddToCart(item, event, selectedQuantityKg);
            }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </motion.article>
  );
}
