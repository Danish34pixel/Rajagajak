import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import * as api from "../services/api.js";

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const section = location.pathname.includes("coupons")
    ? "coupons"
    : "products";
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [product, setProduct] = useState({
    title: "",
    bulletPoints: [""],
    images: [],
    mrp: "",
    discount: "0",
  });
  const [coupon, setCoupon] = useState({
    code: "",
    title: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minimumOrderValue: "0",
    maximumDiscount: "",
    startDate: "",
    expiryDate: "",
    isActive: true,
  });
  const [editing, setEditing] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  const load = async () => {
    try {
      const [productResponse, couponResponse] = await Promise.all([
        api.adminProducts(),
        api.adminCoupons(),
      ]);
      setProducts(productResponse.data);
      setCoupons(couponResponse.data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const finalPrice = Math.max(
    0,
    Number(product.mrp || 0) * (1 - Number(product.discount || 0) / 100),
  );
  const saveProduct = async (event) => {
    event.preventDefault();
    setError("");
    if (uploadingImages) {
      setError("Please wait until all images finish uploading.");
      return;
    }
    if (product.images.length + selectedImages.length === 0) {
      setError("Select at least one product image.");
      return;
    }
    try {
      setUploadingImages(true);
      let uploadedImages = [];
      if (selectedImages.length) {
        const response = await api.uploadAdminImages(
          selectedImages.map(({ file }) => file),
        );
        uploadedImages = response.data
          .map((image) => image.url)
          .filter(Boolean);
      }
      const payload = {
        ...product,
        images: [...product.images, ...uploadedImages],
        mrp: Number(product.mrp),
        discount: Number(product.discount),
        bulletPoints: product.bulletPoints.filter(Boolean),
      };
      if (editing) await api.updateProduct(editing, payload);
      else await api.createProduct(payload);
      setNotice(editing ? "Product updated" : "Product created");
      setEditing(null);
      setProduct({
        title: "",
        bulletPoints: [""],
        images: [],
        mrp: "",
        discount: "0",
      });
      selectedImages.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setSelectedImages([]);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploadingImages(false);
    }
  };
  const saveCoupon = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const payload = {
        ...coupon,
        discountValue: Number(coupon.discountValue),
        minimumOrderValue: Number(coupon.minimumOrderValue),
        maximumDiscount:
          coupon.maximumDiscount === "" ? null : Number(coupon.maximumDiscount),
      };
      if (editing) await api.updateCoupon(editing, payload);
      else await api.createCoupon(payload);
      setNotice(editing ? "Coupon updated" : "Coupon created");
      setEditing(null);
      setCoupon({
        code: "",
        title: "",
        description: "",
        discountType: "percentage",
        discountValue: "",
        minimumOrderValue: "0",
        maximumDiscount: "",
        startDate: "",
        expiryDate: "",
        isActive: true,
      });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const remove = async (kind, id) => {
    if (!window.confirm(`Delete this ${kind}?`)) return;
    try {
      if (kind === "product") await api.deleteProduct(id);
      else await api.deleteCoupon(id);
      setNotice(`${kind[0].toUpperCase()}${kind.slice(1)} deleted`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const editProduct = (item) => {
    selectedImages.forEach(({ preview }) => URL.revokeObjectURL(preview));
    setSelectedImages([]);
    setEditing(item._id);
    setProduct({
      ...item,
      images: item.images?.length
        ? item.images
        : item.image
          ? [item.image]
          : [],
      bulletPoints: item.bulletPoints.length ? item.bulletPoints : [""],
    });
    navigate("/admin/products/edit");
  };
  const editCoupon = (item) => {
    setEditing(item._id);
    setCoupon({
      ...item,
      startDate: item.startDate.slice(0, 16),
      expiryDate: item.expiryDate.slice(0, 16),
      maximumDiscount: item.maximumDiscount ?? "",
    });
    navigate("/admin/coupons/edit");
  };

  return (
    <div className="app-shell">
      <Navbar admin />
      <main className="dashboard admin-dashboard">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Operations overview</span>
            <h1>Admin dashboard</h1>
            <p>Manage the catalogue and offers from one place.</p>
          </div>
          <div className="admin-seal">
            <ShieldCheck size={26} />
          </div>
        </div>
        <section className="admin-welcome">
          <BarChart3 size={24} />
          <div>
            <strong>Catalogue and offers</strong>
            <span>Manage the Rajagajak store</span>
          </div>
        </section>
        <nav className="admin-tabs">
          <Link
            className={section === "products" ? "active" : ""}
            to="/admin/products"
          >
            Products ({products.length})
          </Link>
          <Link
            className={section === "coupons" ? "active" : ""}
            to="/admin/coupons"
          >
            Coupons ({coupons.length})
          </Link>
        </nav>
        {error && <div className="alert">{error}</div>}
        {notice && <div className="success-note">{notice}</div>}
        {section === "products" ? (
          <ProductSection
            {...{
              products,
              product,
              setProduct,
              finalPrice,
              saveProduct,
              editing,
              setEditing,
              editProduct,
              remove,
              setError,
              uploadingImages,
              selectedImages,
              setSelectedImages,
            }}
          />
        ) : (
          <CouponSection
            {...{
              coupons,
              coupon,
              setCoupon,
              saveCoupon,
              editing,
              setEditing,
              editCoupon,
              remove,
            }}
          />
        )}
      </main>
    </div>
  );
}

function ProductSection({
  products,
  product,
  setProduct,
  finalPrice,
  saveProduct,
  editing,
  setEditing,
  editProduct,
  remove,
  setError,
  uploadingImages,
  selectedImages,
  setSelectedImages,
}) {
  const uploadImages = async (event) => {
    const files = [...event.target.files];
    const availableSlots = 5 - product.images.length - selectedImages.length;
    if (files.length > availableSlots) {
      setError("You can upload a maximum of 5 images.");
      event.target.value = "";
      return;
    }
    if (files.some((file) => !file.type.startsWith("image/"))) {
      setError("Only image files are allowed.");
      event.target.value = "";
      return;
    }
    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
      setError("Each image must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }
    if (!files.length) return;
    setError("");
    setSelectedImages((current) => [
      ...current,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
    event.target.value = "";
  };
  return (
    <section className="admin-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Catalogue</span>
          <h2>Products</h2>
        </div>
        <Link className="primary-button admin-action" to="/admin/products/add">
          <Plus size={17} /> Add product
        </Link>
      </div>
      <form className="admin-form" onSubmit={saveProduct}>
        <input
          required
          placeholder="Product title"
          value={product.title}
          onChange={(e) => setProduct({ ...product, title: e.target.value })}
        />
        <div className="admin-grid">
          <input
            required
            type="number"
            min="0"
            placeholder="MRP"
            value={product.mrp}
            onChange={(e) => setProduct({ ...product, mrp: e.target.value })}
          />
          <input
            required
            type="number"
            min="0"
            max="100"
            placeholder="Discount %"
            value={product.discount}
            onChange={(e) =>
              setProduct({ ...product, discount: e.target.value })
            }
          />
          <output>Final price: ₹{finalPrice.toFixed(2)}</output>
        </div>
        <label className="upload-field">
          Product images (up to 5)
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploadingImages}
            onChange={uploadImages}
          />
        </label>
        {uploadingImages && (
          <p className="upload-status">Uploading images...</p>
        )}
        {(product.images.length > 0 || selectedImages.length > 0) && (
          <div className="image-preview-row">
            {product.images.map((image) => (
              <div className="image-preview" key={image}>
                <img src={image} alt="Product preview" />
                <button
                  type="button"
                  onClick={() =>
                    setProduct({
                      ...product,
                      images: product.images.filter((item) => item !== image),
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            {selectedImages.map(({ preview }, index) => (
              <div className="image-preview" key={preview}>
                <img src={preview} alt="Selected product preview" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(preview);
                    setSelectedImages((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    );
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="bullet-editor">
          <strong>Bullet points</strong>
          {product.bulletPoints.map((point, index) => (
            <div className="bullet-row" key={index}>
              <input
                value={point}
                placeholder="Product benefit"
                onChange={(e) => {
                  const next = [...product.bulletPoints];
                  next[index] = e.target.value;
                  setProduct({ ...product, bulletPoints: next });
                }}
              />
              <button
                type="button"
                onClick={() =>
                  setProduct({
                    ...product,
                    bulletPoints: product.bulletPoints.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setProduct({
                ...product,
                bulletPoints: [...product.bulletPoints, ""],
              })
            }
          >
            Add bullet point
          </button>
        </div>
        <div className="form-actions">
          <button
            className="primary-button"
            type="submit"
            disabled={uploadingImages}
          >
            {editing ? "Update product" : "Save product"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                selectedImages.forEach(({ preview }) =>
                  URL.revokeObjectURL(preview),
                );
                setSelectedImages([]);
                setProduct({
                  title: "",
                  bulletPoints: [""],
                  images: [],
                  mrp: "",
                  discount: "0",
                });
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <div className="admin-list">
        {products.map((item) => (
          <article className="admin-row" key={item._id}>
            <div>
              <strong>{item.title}</strong>
              <span>
                {item.discount}% off · ₹{item.finalPrice.toFixed(2)}
              </span>
            </div>
            <div className="row-actions">
              <button title="Edit" onClick={() => editProduct(item)}>
                <Pencil size={16} />
              </button>
              <button
                title="Delete"
                onClick={() => remove("product", item._id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CouponSection({
  coupons,
  coupon,
  setCoupon,
  saveCoupon,
  editing,
  setEditing,
  editCoupon,
  remove,
}) {
  return (
    <section className="admin-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Offers</span>
          <h2>Coupons</h2>
        </div>
        <Link
          className="primary-button admin-action"
          to="/admin/coupons/create"
        >
          <Plus size={17} /> Create coupon
        </Link>
      </div>
      <form className="admin-form" onSubmit={saveCoupon}>
        <div className="admin-grid">
          <input
            required
            placeholder="Code e.g. SAVE20"
            value={coupon.code}
            onChange={(e) =>
              setCoupon({ ...coupon, code: e.target.value.toUpperCase() })
            }
          />
          <input
            required
            placeholder="Coupon title"
            value={coupon.title}
            onChange={(e) => setCoupon({ ...coupon, title: e.target.value })}
          />
          <select
            value={coupon.discountType}
            onChange={(e) =>
              setCoupon({ ...coupon, discountType: e.target.value })
            }
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
          <input
            required
            type="number"
            min="0"
            placeholder="Discount value"
            value={coupon.discountValue}
            onChange={(e) =>
              setCoupon({ ...coupon, discountValue: e.target.value })
            }
          />
          <input
            type="number"
            min="0"
            placeholder="Minimum order"
            value={coupon.minimumOrderValue}
            onChange={(e) =>
              setCoupon({ ...coupon, minimumOrderValue: e.target.value })
            }
          />
          <input
            type="number"
            min="0"
            placeholder="Maximum discount"
            value={coupon.maximumDiscount}
            onChange={(e) =>
              setCoupon({ ...coupon, maximumDiscount: e.target.value })
            }
          />
          <input
            required
            type="datetime-local"
            value={coupon.startDate}
            onChange={(e) =>
              setCoupon({ ...coupon, startDate: e.target.value })
            }
          />
          <input
            required
            type="datetime-local"
            value={coupon.expiryDate}
            onChange={(e) =>
              setCoupon({ ...coupon, expiryDate: e.target.value })
            }
          />
        </div>
        <textarea
          placeholder="Description"
          value={coupon.description}
          onChange={(e) =>
            setCoupon({ ...coupon, description: e.target.value })
          }
        />
        <label className="check-row">
          <input
            type="checkbox"
            checked={coupon.isActive}
            onChange={(e) =>
              setCoupon({ ...coupon, isActive: e.target.checked })
            }
          />{" "}
          Active
        </label>
        <div className="form-actions">
          <button className="primary-button" type="submit">
            {editing ? "Update coupon" : "Save coupon"}
          </button>
          {editing && (
            <button type="button" onClick={() => setEditing(null)}>
              Cancel
            </button>
          )}
        </div>
      </form>
      <div className="admin-list">
        {coupons.map((item) => (
          <article className="admin-row" key={item._id}>
            <div>
              <strong>
                {item.code} · {item.title}
              </strong>
              <span>
                {item.discountValue}
                {item.discountType === "percentage" ? "%" : "₹"} off ·{" "}
                {item.status}
              </span>
            </div>
            <div className="row-actions">
              <button title="Edit" onClick={() => editCoupon(item)}>
                <Pencil size={16} />
              </button>
              <button title="Delete" onClick={() => remove("coupon", item._id)}>
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
