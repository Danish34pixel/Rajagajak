import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import * as api from "../services/api.js";

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .product(id)
      .then((response) => setProduct(response.data))
      .catch((requestError) => setError(requestError.message));
  }, [id]);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard product-details">
        <Link className="back-link" to="/dashboard">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        {error && <div className="alert">{error}</div>}
        {!product && !error && (
          <p className="section-subtitle">Loading product...</p>
        )}
        {product && (
          <ProductDetailContent
            product={product}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
          />
        )}
      </main>
    </div>
  );
}

function ProductDetailContent({ product, selectedImage, setSelectedImage }) {
  const images = product.images?.length
    ? product.images
    : product.image
      ? [product.image]
      : [];

  return (
    <section className="product-detail-layout">
      <div className="product-gallery">
        {images.length ? (
          <img
            className="product-detail-image"
            src={images[selectedImage] || images[0]}
            alt={product.title}
          />
        ) : (
          <div className="product-detail-placeholder">No image available</div>
        )}
        {images.length > 1 && (
          <div className="gallery-thumbnails">
            {images.map((image, index) => (
              <button
                type="button"
                className={selectedImage === index ? "selected" : ""}
                key={image}
                onClick={() => setSelectedImage(index)}
              >
                <img src={image} alt={`${product.title} ${index + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="product-detail-copy">
        <span className="eyebrow">Product details</span>
        <h1>{product.title}</h1>
        <div className="price-line">
          <del>₹{product.mrp}</del>
          <span>{product.discount}% OFF</span>
          <strong>₹{product.finalPrice}</strong>
        </div>
        <ul>
          {product.bulletPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
