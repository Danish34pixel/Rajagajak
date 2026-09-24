import { useEffect, useMemo, useRef, useState } from "react";
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
import { useFlyToCart } from "../components/FlyToCart.jsx";
import * as api from "../services/api.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { triggerFlight } = useFlyToCart();
  const productImageRef = useRef(null);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedKg, setSelectedKg] = useState(1);
  const [openSection, setOpenSection] = useState("description");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [id]);

  useEffect(() => {
    api
      .product(id)
      .then((response) => setProduct(response.data))
      .catch((requestError) => setError(requestError.message));
  }, [id]);

  useEffect(() => {
    setSelectedKg(1);
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
  const kgOptions = [1, 2, 3, 5, 10];
  const maxStock = hasStock && stock > 0 ? stock : 10;

  const addProduct = (buyNow = false) => {
    const nextQuantity = Math.max(1, Math.min(selectedKg, maxStock));
    if (hasStock && stock <= 0) {
      setActionMessage("This product is currently out of stock.");
      return;
    }
    triggerFlight({
      source: productImageRef.current,
      imageSrc: images[selectedImage] || images[0] || "",
      alt: product.title,
    });
    addToCart(product, nextQuantity);
    if (buyNow) navigate("/checkout");
    else
      setActionMessage(
        `${nextQuantity} KG of ${product.title} was added to your bag.`,
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
              imageRef={productImageRef}
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
              <div className="kg-selector">
                <span className="selection-label">
                  How many KG do you need?
                </span>
                <div className="kg-preset-group">
                  {kgOptions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={selectedKg === value ? "selected" : ""}
                      onClick={() => setSelectedKg(Math.min(value, maxStock))}
                    >
                      {value} KG
                    </button>
                  ))}
                </div>
                <div className="quantity-control">
                  <button
                    type="button"
                    aria-label="Decrease KG quantity"
                    onClick={() =>
                      setSelectedKg((current) => Math.max(1, current - 1))
                    }
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span>{selectedKg} KG</span>
                  <button
                    type="button"
                    aria-label="Increase KG quantity"
                    onClick={() =>
                      setSelectedKg((current) =>
                        Math.min(current + 1, maxStock),
                      )
                    }
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
              <p className="kg-note">
                Selected: {selectedKg} KG · Total:{" "}
                {money(product.finalPrice * selectedKg)}
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

function ProductGallery({
  product,
  images,
  selectedImage,
  setSelectedImage,
  imageRef,
}) {
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
            ref={imageRef}
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
