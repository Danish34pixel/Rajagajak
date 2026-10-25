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
import ProductCard from "../components/ProductCard.jsx";
import { useCart } from "../context/useCart.js";
import { useFlyToCart } from "../components/FlyToCart.jsx";
import * as api from "../services/api.js";
import { getProductSuggestions } from "../utils/products.js";
import {
  DEFAULT_QUANTITY_KG,
  formatQuantity,
  getNextQuantityKg,
  getQuantityOptions,
  isValidCustomQuantityKg,
  getSelectableMaxStockKg,
} from "../utils/quantity.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartItems } = useCart();
  const { triggerFlight } = useFlyToCart();
  const productImageRef = useRef(null);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [catalogState, setCatalogState] = useState(() => ({
    productId: id,
    products: [],
    loading: true,
    error: "",
  }));
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantitySelection, setQuantitySelection] = useState(() => ({
    productId: id,
    kg: DEFAULT_QUANTITY_KG,
  }));
  const [customWeight, setCustomWeight] = useState(false);
  const [customWeightInput, setCustomWeightInput] = useState(
    String(DEFAULT_QUANTITY_KG),
  );
  const [openSection, setOpenSection] = useState("description");
  const [actionMessage, setActionMessage] = useState("");

  const presetSelectedKg =
    quantitySelection.productId === id
      ? quantitySelection.kg
      : DEFAULT_QUANTITY_KG;
  const selectedKg =
    customWeight &&
    isValidCustomQuantityKg(customWeightInput, Infinity)
      ? Number(customWeightInput)
      : presetSelectedKg;
  const setSelectedKg = (nextQuantity) => {
    setQuantitySelection((current) => ({
      productId: id,
      kg:
        typeof nextQuantity === "function"
          ? nextQuantity(
              current.productId === id
                ? current.kg
                : DEFAULT_QUANTITY_KG,
            )
          : nextQuantity,
    }));
  };
  const selectCustomWeight = () => {
    setCustomWeight(true);
    setCustomWeightInput(String(selectedKg));
  };
  const updateCustomWeight = (value) => {
    setCustomWeightInput(value);
  };
  const currentCatalogState =
    catalogState.productId === id
      ? catalogState
      : { products: [], loading: true, error: "" };
  const catalog = currentCatalogState.products;
  const catalogLoading = currentCatalogState.loading;
  const catalogError = currentCatalogState.error;

  useEffect(() => {
    let cancelled = false;
    api
      .product(id)
      .then((response) => {
        if (!cancelled) setProduct(response.data);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    api
      .products()
      .then((response) => {
        if (!cancelled) {
          setCatalogState({
            productId: id,
            products: Array.isArray(response.data) ? response.data : [],
            loading: false,
            error: "",
          });
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setCatalogState({
            productId: id,
            products: [],
            loading: false,
            error:
              requestError.message || "Unable to load product suggestions.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
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
  const pricePerKg = Number(
    product?.finalPrice ?? product?.pricePerKg ?? product?.price ?? 0,
  );
  const mrpPerKg = Number(
    product?.mrp ?? product?.mrpPerKg ?? pricePerKg,
  );
  const description =
    product?.description ||
    product?.bulletPoints?.join(" ") ||
    "No product description is available yet.";
  const maxStock = hasStock
    ? getSelectableMaxStockKg(stock)
    : Infinity;
  const kgOptions = getQuantityOptions(maxStock);
  const selectable = kgOptions.length > 0;
  const customWeightValid =
    !customWeight || isValidCustomQuantityKg(customWeightInput, Infinity);
  const cartProduct = cartItems.find(
    (item) => item.productId === (product?._id || product?.id),
  );
  const remainingStock = hasStock
    ? Math.max(0, maxStock - (cartProduct?.quantityKg || 0))
    : Infinity;
  const selectedWeightAvailable = selectedKg <= remainingStock;
  const suggestions = useMemo(
    () => (product ? getProductSuggestions(catalog, product) : []),
    [catalog, product],
  );

  const addProduct = (buyNow = false) => {
    const nextQuantity = selectedKg;
    if (!customWeightValid) {
      setActionMessage("Enter a valid weight in 1 g increments.");
      return;
    }
    if (!selectable || (hasStock && stock <= 0)) {
      setActionMessage("This product is currently out of stock.");
      return;
    }
    if (!selectedWeightAvailable) {
      setActionMessage(
        hasStock
          ? `Only ${formatQuantity(remainingStock)} more is available for ${product.title}.`
          : `The requested weight is not available for ${product.title}.`,
      );
      return;
    }
    triggerFlight({
      source: productImageRef.current,
      imageSrc: images[selectedImage] || images[0] || "",
      alt: product.title,
    });
    const added = addToCart(product, nextQuantity);
    if (!added) {
      setActionMessage(
        `Only ${formatQuantity(remainingStock)} more is available for ${product.title}.`,
      );
      return;
    }
    if (buyNow) navigate("/checkout");
    else
      setActionMessage(
        `${formatQuantity(nextQuantity)} of ${product.title} was added to your bag.`,
      );
  };

  const addSuggestedProduct = (item, event) => {
    const source = event.currentTarget
      .closest(".product-card")
      ?.querySelector(".product-card-media img");
    triggerFlight({
      source,
      imageSrc: item.images?.[0] || item.image || "",
      alt: item.title,
    });
    addToCart(item, DEFAULT_QUANTITY_KG);
    setActionMessage(
      `${formatQuantity(DEFAULT_QUANTITY_KG)} of ${item.title} was added to your bag.`,
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
              <div className="product-detail-price" aria-live="polite">
                <span className="selected-price-label">
                  Price for {formatQuantity(selectedKg)}
                </span>
                <strong>{money(pricePerKg * selectedKg)}</strong>
                <div className="product-detail-price-meta">
                  <span>{money(pricePerKg)}/kg</span>
                  {mrpPerKg > 0 && (
                    <del>
                      MRP {money(mrpPerKg * selectedKg)}
                    </del>
                  )}
                  {Number(product.discount) > 0 && (
                    <span className="product-detail-discount">
                      {product.discount}% OFF
                    </span>
                  )}
                </div>
              </div>
              {hasStock && (
                <p className="kg-stock">
                  Available stock: {formatQuantity(stock)}
                </p>
              )}
              <div className="kg-selector">
                <span className="selection-label">
                  How much do you need?
                </span>
                <div className="kg-preset-group">
                  {kgOptions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        !customWeight && selectedKg === value ? "selected" : ""
                      }
                      onClick={() => {
                        setCustomWeight(false);
                        setSelectedKg(Math.min(value, maxStock));
                      }}
                    >
                      {formatQuantity(value)}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={customWeight ? "selected" : ""}
                    disabled={!selectable}
                    onClick={selectCustomWeight}
                  >
                    Custom
                  </button>
                </div>
                {customWeight && (
                  <label className="custom-weight-field">
                    <span>Enter weight in kg</span>
                    <div className="custom-weight-input-wrap">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={DEFAULT_QUANTITY_KG}
                        max={Number.isFinite(maxStock) ? maxStock : undefined}
                        step="0.001"
                        value={customWeightInput}
                        disabled={!selectable}
                        onChange={(event) =>
                          updateCustomWeight(event.target.value)
                        }
                        onBlur={() => {
                          const quantity = Number(customWeightInput);
                          if (!isValidCustomQuantityKg(quantity, Infinity)) {
                            setCustomWeightInput(String(selectedKg));
                          }
                        }}
                        aria-describedby="custom-weight-hint"
                      />
                      <span>kg</span>
                    </div>
                    <small id="custom-weight-hint">
                      Choose at least {formatQuantity(DEFAULT_QUANTITY_KG)} in
                      1 g increments
                      {Number.isFinite(maxStock)
                        ? `, up to ${formatQuantity(maxStock)} available.`
                        : "."}
                    </small>
                    {!customWeightValid && (
                      <small className="custom-weight-error" role="alert">
                        Enter at least {formatQuantity(DEFAULT_QUANTITY_KG)} in
                        1 g increments.
                      </small>
                    )}
                  </label>
                )}
                {!selectedWeightAvailable && hasStock && (
                  <p className="custom-weight-error" role="alert">
                    Only {formatQuantity(remainingStock)} more is available for
                    this order.
                  </p>
                )}
                <div className="quantity-control">
                  <button
                    type="button"
                    aria-label="Decrease KG quantity"
                    disabled={selectedKg <= DEFAULT_QUANTITY_KG}
                    onClick={() => {
                      setCustomWeight(false);
                      setSelectedKg((current) =>
                        getNextQuantityKg(current, -1, maxStock),
                      );
                    }}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span>{formatQuantity(selectedKg)}</span>
                  <button
                    type="button"
                    aria-label="Increase KG quantity"
                    disabled={
                      getNextQuantityKg(selectedKg, 1, maxStock) <= selectedKg
                    }
                    onClick={() => {
                      setCustomWeight(false);
                      setSelectedKg((current) =>
                        getNextQuantityKg(current, 1, maxStock),
                      );
                    }}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
              <div className="product-actions">
                <button
                  className="primary-action"
                  type="button"
                  disabled={
                    !selectable ||
                    !customWeightValid ||
                    !selectedWeightAvailable ||
                    (hasStock && stock <= 0)
                  }
                  onClick={() => addProduct()}
                >
                  <ShoppingBag size={17} /> Add to cart
                </button>
                <button
                  className="outline-action"
                  type="button"
                  disabled={
                    !selectable ||
                    !customWeightValid ||
                    !selectedWeightAvailable ||
                    (hasStock && stock <= 0)
                  }
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
        {product && (
          <section className="product-suggestions">
            <div className="section-heading">
              <div>
                <span className="eyebrow">More to explore</span>
                <h2>You May Also Like</h2>
              </div>
            </div>
            {catalogLoading && (
              <div
                className="product-grid"
                aria-label="Loading product suggestions"
              >
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="product-skeleton" />
                ))}
              </div>
            )}
            {!catalogLoading && catalogError && (
              <p className="suggestion-state">{catalogError}</p>
            )}
            {!catalogLoading &&
              !catalogError &&
              suggestions.length === 0 && (
                <p className="suggestion-state">
                  There are no other products to suggest right now.
                </p>
              )}
            {!catalogLoading && !catalogError && suggestions.length > 0 && (
              <div className="product-grid">
                {suggestions.map((item) => (
                  <ProductCard
                    key={item._id || item.id}
                    item={item}
                    onAddToCart={addSuggestedProduct}
                  />
                ))}
              </div>
            )}
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
