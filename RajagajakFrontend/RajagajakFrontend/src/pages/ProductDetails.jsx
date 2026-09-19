import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/useCart.js";
import * as api from "../services/api.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [openSection, setOpenSection] = useState("description");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    api
      .product(id)
      .then((response) => setProduct(response.data))
      .catch((requestError) => setError(requestError.message));
  }, [id]);

  const images = useMemo(
    () =>
      (product?.images?.length
        ? product.images
        : product?.image
          ? [product.image]
          : []
      )
        .filter(Boolean)
        .slice(0, 5),
    [product],
  );
  const stock = Number(product?.stock ?? 0);
  const hasStock =
    product && Object.prototype.hasOwnProperty.call(product, "stock");
  const description =
    product?.description ||
    product?.bulletPoints?.join(" ") ||
    "No product description is available yet.";
  const addProduct = (buyNow = false) => {
    if (hasStock && stock <= 0) {
      setActionMessage("This product is currently out of stock.");
      return;
    }
    addToCart(product, 1);
    if (buyNow) navigate("/checkout");
    else
      setActionMessage(
        "Added to your bag. Choose the KG quantity at checkout.",
      );
  };

  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard product-details">
        <Link className="back-link" to="/dashboard">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        {!product && !error && (
          <div className="product-detail-loading">
            <div className="product-skeleton" />
          </div>
        )}
        {error && <div className="alert">{error}</div>}
        {product && (
          <section className="product-detail-layout">
            <ProductGallery
              product={product}
              images={images}
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
            />
            <div className="product-detail-copy">
              <span className="eyebrow">
                {product.category || "Product details"}
              </span>
              <h1>{product.title}</h1>
              <div className="price-line product-detail-price">
                <del>{money(product.mrp)}/kg</del>
                {Number(product.discount) > 0 && (
                  <span>{product.discount}% OFF</span>
                )}
                <strong>{money(product.finalPrice)}/kg</strong>
              </div>
              {hasStock && (
                <p className="kg-stock">Available stock: {stock} KG</p>
              )}
              <p className="kg-note">
                Price shown per kilogram. Select your required quantity during
                checkout.
              </p>
              <div className="product-actions">
                <button
                  className="primary-action"
                  type="button"
                  disabled={hasStock && stock <= 0}
                  onClick={() => addProduct()}
                >
                  <ShoppingBag size={17} /> Add to cart
                </button>
                <button
                  className="outline-action"
                  type="button"
                  disabled={hasStock && stock <= 0}
                  onClick={() => addProduct(true)}
                >
                  Buy it now
                </button>
              </div>
              {actionMessage && (
                <p className="action-message" role="status">
                  {actionMessage}
                </p>
              )}
              <ProductAccordion
                title="Product description"
                open={openSection === "description"}
                onClick={() =>
                  setOpenSection(
                    openSection === "description" ? "" : "description",
                  )
                }
              >
                <p>{description}</p>
              </ProductAccordion>
              <ProductAccordion
                title="Shipping & returns"
                open={openSection === "shipping"}
                onClick={() =>
                  setOpenSection(openSection === "shipping" ? "" : "shipping")
                }
              >
                <p>
                  We will share delivery and return details during checkout.
                </p>
              </ProductAccordion>
              <ProductAccordion
                title={`Reviews${product.reviewCount ? ` (${product.reviewCount})` : ""}`}
                open={openSection === "reviews"}
                onClick={() =>
                  setOpenSection(openSection === "reviews" ? "" : "reviews")
                }
              >
                <p>No reviews are available for this product yet.</p>
              </ProductAccordion>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ProductGallery({ product, images, selectedImage, setSelectedImage }) {
  const move = (amount) =>
    setSelectedImage(
      Math.max(0, Math.min(selectedImage + amount, images.length - 1)),
    );
  return (
    <div className="product-gallery">
      <div className="gallery-main">
        <button
          type="button"
          className="gallery-arrow gallery-arrow-left"
          aria-label="Previous image"
          disabled={images.length < 2}
          onClick={() => move(-1)}
        >
          <ChevronLeft size={20} />
        </button>
        {images.length ? (
          <img
            className="product-detail-image"
            src={images[selectedImage] || images[0]}
            alt={product.title}
          />
        ) : (
          <div className="product-detail-placeholder">No image available</div>
        )}
        <button
          type="button"
          className="gallery-arrow gallery-arrow-right"
          aria-label="Next image"
          disabled={images.length < 2}
          onClick={() => move(1)}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbnails">
          {images.map((image, index) => (
            <button
              type="button"
              className={selectedImage === index ? "selected" : ""}
              key={`${image}-${index}`}
              onClick={() => setSelectedImage(index)}
            >
              <img src={image} alt={`${product.title} ${index + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductAccordion({ title, open, onClick, children }) {
  return (
    <div className="product-accordion">
      <button type="button" onClick={onClick} aria-expanded={open}>
        <strong>{title}</strong>
        <ChevronDown size={18} className={open ? "is-open" : ""} />
      </button>
      {open && <div className="accordion-content">{children}</div>}
    </div>
  );
}
