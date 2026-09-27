import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import * as api from "../services/api.js";
import AdminOrderSection from "./AdminOrderSection.jsx";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const emptyCoupon = () => ({
  code: "",
  title: "",
  description: "",
  type: "percentage",
  discountType: "percentage",
  discountValue: "",
  minimumOrderValue: "0",
  minimumQuantity: "0",
  maximumDiscount: "",
  buyQuantity: "",
  getQuantity: "",
  getDiscountPercentage: "",
  getDiscountAmount: "",
  applicableProducts: [],
  applicableCategories: [],
  eligibilityType: "everyone",
  eligibleUsers: [],
  cities: "",
  pincodes: "",
  radiusKm: "",
  paymentMethods: [],
  allowedDays: [],
  usageLimit: "",
  perUserLimit: "",
  startDate: "",
  expiryDate: "",
  isActive: true,
  campaignName: "",
  campaignType: "standard",
});

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const section = location.pathname.includes("coupons")
    ? "coupons"
    : location.pathname.includes("orders")
      ? "orders"
      : "products";
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [orders, setOrders] = useState([]);
  const [couponUsers, setCouponUsers] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [product, setProduct] = useState({
    title: "",
    bulletPoints: [""],
    images: [],
    mrp: "",
    discount: "0",
    gstPercentage: "0",
    stock: "0",
    category: "",
  });
  const [coupon, setCoupon] = useState(emptyCoupon);
  const [editing, setEditing] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  const load = async () => {
    try {
      const [productResponse, couponResponse, orderResponse, userResponse] =
        await Promise.all([
          api.adminProducts(),
          api.adminCoupons(),
          api.adminOrders(),
          api.adminCouponUsers(),
        ]);
      setProducts(productResponse.data);
      setCoupons(couponResponse.data);
      setOrders(orderResponse.data);
      setCouponUsers(userResponse.data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
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
        gstPercentage: Number(product.gstPercentage),
        stock: Number(product.stock),
        category: product.category,
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
        gstPercentage: "0",
        stock: "0",
        category: "",
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
        type: coupon.type,
        discountValue: Number(coupon.discountValue),
        minimumOrderValue: Number(coupon.minimumOrderValue),
        maximumDiscount:
          coupon.maximumDiscount === "" ? null : Number(coupon.maximumDiscount),
        minimumQuantity: Number(coupon.minimumQuantity || 0),
        buyQuantity:
          coupon.buyQuantity === "" ? null : Number(coupon.buyQuantity),
        getQuantity:
          coupon.getQuantity === "" ? null : Number(coupon.getQuantity),
        getDiscountPercentage:
          coupon.getDiscountPercentage === ""
            ? null
            : Number(coupon.getDiscountPercentage),
        getDiscountAmount:
          coupon.getDiscountAmount === ""
            ? null
            : Number(coupon.getDiscountAmount),
        usageLimit: coupon.usageLimit === "" ? null : Number(coupon.usageLimit),
        perUserLimit:
          coupon.perUserLimit === "" ? null : Number(coupon.perUserLimit),
        radiusKm: coupon.radiusKm === "" ? null : Number(coupon.radiusKm),
        cities:
          typeof coupon.cities === "string"
            ? coupon.cities
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean)
            : coupon.cities,
        pincodes:
          typeof coupon.pincodes === "string"
            ? coupon.pincodes
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean)
            : coupon.pincodes,
      };
      if (editing) await api.updateCoupon(editing, payload);
      else await api.createCoupon(payload);
      setNotice(editing ? "Coupon updated" : "Coupon created");
      setEditing(null);
      setCoupon(emptyCoupon());
      await load();
      navigate("/admin/coupons");
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
      gstPercentage: item.gstPercentage ?? "0",
      stock: item.stock ?? "0",
      category: item.category || "",
    });
    navigate("/admin/products/edit");
  };
  const editCoupon = (item) => {
    setEditing(item._id);
    setCoupon({
      ...emptyCoupon(),
      ...item,
      type: item.type || item.discountType,
      startDate: item.startDate?.slice(0, 16) || "",
      expiryDate: item.expiryDate?.slice(0, 16) || "",
      maximumDiscount: item.maximumDiscount ?? "",
      minimumQuantity: item.minimumQuantity ?? "0",
      buyQuantity: item.buyQuantity ?? "",
      getQuantity: item.getQuantity ?? "",
      getDiscountPercentage: item.getDiscountPercentage ?? "",
      getDiscountAmount: item.getDiscountAmount ?? "",
      usageLimit: item.usageLimit ?? "",
      perUserLimit: item.perUserLimit ?? "",
      radiusKm: item.radiusKm ?? "",
      cities: item.cities?.join(", ") || "",
      pincodes: item.pincodes?.join(", ") || "",
    });
    navigate("/admin/coupons/edit");
  };
  const toggleCoupon = async (item) => {
    try {
      await api.updateCoupon(item._id, { ...item, isActive: !item.isActive });
      setNotice(`Coupon ${item.isActive ? "deactivated" : "activated"}`);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
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
          <Link
            className={section === "orders" ? "active" : ""}
            to="/admin/orders"
          >
            Orders ({orders.length})
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
        ) : section === "coupons" ? (
          <CouponSection
            {...{
              coupons,
              products,
              couponUsers,
              couponFormOpen:
                location.pathname.endsWith("/create") ||
                location.pathname.endsWith("/edit"),
              coupon,
              setCoupon,
              saveCoupon,
              editing,
              setEditing,
              editCoupon,
              toggleCoupon,
              remove,
            }}
          />
        ) : (
          <AdminOrderSection
            orders={orders}
            reload={load}
            setError={setError}
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
            placeholder="MRP per KG"
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
          <input
            type="number"
            min="0"
            max="100"
            placeholder="GST %"
            value={product.gstPercentage}
            onChange={(e) =>
              setProduct({ ...product, gstPercentage: e.target.value })
            }
          />
          <input
            required
            type="number"
            min="0"
            step="0.001"
            placeholder="Stock"
            value={product.stock}
            onChange={(e) => setProduct({ ...product, stock: e.target.value })}
          />
          <input
            placeholder="Category"
            value={product.category}
            onChange={(e) =>
              setProduct({ ...product, category: e.target.value })
            }
          />
          <output>Final price: ₹{finalPrice.toFixed(2)}/kg</output>
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
                  gstPercentage: "0",
                  stock: "0",
                  category: "",
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
                {item.discount}% off · ₹{item.finalPrice.toFixed(2)}/kg ·{" "}
                {item.stock} KG in stock
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
  products,
  couponUsers,
  couponFormOpen,
  coupon,
  setCoupon,
  saveCoupon,
  editing,
  setEditing,
  editCoupon,
  toggleCoupon,
  remove,
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedCoupon, setExpandedCoupon] = useState(null);
  const [couponAnalytics, setCouponAnalytics] = useState({});
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOptions, setCustomerOptions] = useState(couponUsers);
  const categories = [
    ...new Set(products.map((item) => item.category).filter(Boolean)),
  ];
  const filteredCoupons = coupons.filter((item) => {
    const type = item.type || item.discountType;
    return (
      (!search ||
        `${item.code} ${item.title}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (statusFilter === "all" || item.status === statusFilter) &&
      (typeFilter === "all" || type === typeFilter)
    );
  });
  const update = (field, value) =>
    setCoupon((current) => ({ ...current, [field]: value }));
  const updateSelected = (field, event, convert = (value) => value) =>
    update(
      field,
      [...event.currentTarget.selectedOptions].map((option) =>
        convert(option.value),
      ),
    );
  useEffect(() => {
    if (coupon.eligibilityType !== "specific_users") return undefined;
    let active = true;
    const timer = setTimeout(() => {
      api
        .adminCouponUsers(customerSearch)
        .then((response) => {
          if (active) setCustomerOptions(response.data);
        })
        .catch(() => {
          if (active) setCustomerOptions([]);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [coupon.eligibilityType, customerSearch]);
  const couponTypes = [
    ["percentage", "Percentage discount"],
    ["fixed", "Fixed amount discount"],
    ["free_shipping", "Free shipping"],
    ["fixed_shipping", "Fixed shipping"],
    ["buy_x_get_y", "Buy X get Y free"],
    ["buy_x_get_percentage", "Buy X get percentage off"],
    ["buy_x_get_fixed", "Buy X get fixed amount off"],
  ];
  const typeLabels = Object.fromEntries(couponTypes);
  const discountLabel = (item) => {
    const type = item.type || item.discountType;
    if (type === "free_shipping") return "Free shipping";
    if (type === "fixed_shipping")
      return `Shipping ${money(item.discountValue)}`;
    if (type === "buy_x_get_y")
      return `Buy ${item.buyQuantity} get ${item.getQuantity}`;
    if (type === "buy_x_get_percentage")
      return `${item.getDiscountPercentage}% on get quantity`;
    if (type === "buy_x_get_fixed")
      return `${money(item.getDiscountAmount)} on get quantity`;
    return `${type === "percentage" ? `${item.discountValue}%` : money(item.discountValue)} off`;
  };
  const showCouponDetails = async (item) => {
    if (expandedCoupon === item._id) {
      setExpandedCoupon(null);
      return;
    }
    setExpandedCoupon(item._id);
    try {
      const response = await api.adminCoupon(item._id);
      setCouponAnalytics((current) => ({
        ...current,
        [item._id]: response.data,
      }));
    } catch {
      setCouponAnalytics((current) => ({ ...current, [item._id]: item }));
    }
  };
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
      {couponFormOpen && (
        <form className="admin-form" onSubmit={saveCoupon}>
          <div className="admin-grid">
            <input
              required
              placeholder="Code e.g. SAVE20"
              value={coupon.code}
              onChange={(e) => update("code", e.target.value.toUpperCase())}
            />
            <input
              required
              placeholder="Coupon title"
              value={coupon.title}
              onChange={(e) => update("title", e.target.value)}
            />
            <select
              value={coupon.type}
              onChange={(e) => update("type", e.target.value)}
            >
              {couponTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {coupon.type !== "free_shipping" &&
              !coupon.type.startsWith("buy_x_get_") && (
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={
                    coupon.type === "percentage"
                      ? "Discount %"
                      : "Discount value"
                  }
                  value={coupon.discountValue}
                  onChange={(e) => update("discountValue", e.target.value)}
                />
              )}
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Minimum order"
              value={coupon.minimumOrderValue}
              onChange={(e) => update("minimumOrderValue", e.target.value)}
            />
            <input
              type="number"
              min="0"
              step="0.001"
              placeholder="Minimum quantity (KG)"
              value={coupon.minimumQuantity}
              onChange={(e) => update("minimumQuantity", e.target.value)}
            />
            {(coupon.type === "percentage" ||
              coupon.type === "buy_x_get_percentage") && (
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Maximum discount"
                value={coupon.maximumDiscount}
                onChange={(e) => update("maximumDiscount", e.target.value)}
              />
            )}
            {coupon.type.startsWith("buy_x_get_") && (
              <>
                <input
                  required
                  type="number"
                  min="0.001"
                  step="0.001"
                  placeholder="Buy quantity (KG)"
                  value={coupon.buyQuantity}
                  onChange={(e) => update("buyQuantity", e.target.value)}
                />
                <input
                  required
                  type="number"
                  min="0.001"
                  step="0.001"
                  placeholder="Get quantity (KG)"
                  value={coupon.getQuantity}
                  onChange={(e) => update("getQuantity", e.target.value)}
                />
                {coupon.type === "buy_x_get_percentage" && (
                  <input
                    required
                    type="number"
                    min="0.01"
                    max="100"
                    placeholder="Get discount %"
                    value={coupon.getDiscountPercentage}
                    onChange={(e) =>
                      update("getDiscountPercentage", e.target.value)
                    }
                  />
                )}
                {coupon.type === "buy_x_get_fixed" && (
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Get discount amount"
                    value={coupon.getDiscountAmount}
                    onChange={(e) =>
                      update("getDiscountAmount", e.target.value)
                    }
                  />
                )}
              </>
            )}
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Total usage limit (blank = unlimited)"
              value={coupon.usageLimit}
              onChange={(e) => update("usageLimit", e.target.value)}
            />
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Uses per customer (blank = unlimited)"
              value={coupon.perUserLimit}
              onChange={(e) => update("perUserLimit", e.target.value)}
            />
            <input
              required
              type="datetime-local"
              value={coupon.startDate}
              onChange={(e) => update("startDate", e.target.value)}
            />
            <input
              required
              type="datetime-local"
              value={coupon.expiryDate}
              onChange={(e) => update("expiryDate", e.target.value)}
            />
          </div>
          <textarea
            placeholder="Description"
            value={coupon.description}
            onChange={(e) => update("description", e.target.value)}
          />
          <div className="admin-grid coupon-rule-grid">
            <label>
              Customer eligibility
              <select
                value={coupon.eligibilityType}
                onChange={(e) => update("eligibilityType", e.target.value)}
              >
                <option value="everyone">Everyone</option>
                <option value="first_order">First order only</option>
                <option value="returning">Returning customers</option>
                <option value="specific_users">Specific customers</option>
                <option value="referral">Referral (not enabled)</option>
                <option value="cart_abandonment">
                  Cart abandonment (not enabled)
                </option>
                <option value="reorder">Reorder (not enabled)</option>
                <option value="loyalty">Loyalty (not enabled)</option>
                <option value="birthday">Birthday (not enabled)</option>
                <option value="review_reward">
                  Review reward (not enabled)
                </option>
              </select>
            </label>
            {coupon.eligibilityType === "specific_users" && (
              <label>
                Eligible customers (Ctrl/Cmd-click to select)
                <input
                  placeholder="Search name, email, or mobile"
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                />
                <select
                  multiple
                  size="4"
                  value={coupon.eligibleUsers.map(String)}
                  onChange={(e) => updateSelected("eligibleUsers", e)}
                >
                  {customerOptions.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} · {user.email} · {user.mobile}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Eligible products (none = all)
              <select
                multiple
                size="4"
                value={coupon.applicableProducts.map(String)}
                onChange={(e) => updateSelected("applicableProducts", e)}
              >
                {products.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Eligible categories (none = all)
              <select
                multiple
                size="4"
                value={coupon.applicableCategories}
                onChange={(e) => updateSelected("applicableCategories", e)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <input
              placeholder="Cities, comma separated"
              value={coupon.cities}
              onChange={(e) => update("cities", e.target.value)}
            />
            <input
              placeholder="Pincodes, comma separated"
              value={coupon.pincodes}
              onChange={(e) => update("pincodes", e.target.value)}
            />
            <input
              type="number"
              min="0.1"
              step="0.1"
              placeholder="Maximum delivery radius (KM)"
              value={coupon.radiusKm}
              onChange={(e) => update("radiusKm", e.target.value)}
            />
            <label>
              Payment methods (none = all)
              <select
                multiple
                size="4"
                value={coupon.paymentMethods}
                onChange={(e) => updateSelected("paymentMethods", e)}
              >
                <option value="cod">Cash on delivery</option>
                <option value="online">Online</option>
                <option value="upi">UPI</option>
                <option value="razorpay">Razorpay</option>
                <option value="stripe">Stripe</option>
              </select>
            </label>
            <label>
              Allowed days (none = every day)
              <select
                multiple
                size="4"
                value={coupon.allowedDays.map(String)}
                onChange={(e) => updateSelected("allowedDays", e, Number)}
              >
                {[
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ].map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <input
              placeholder="Campaign name"
              value={coupon.campaignName}
              onChange={(e) => update("campaignName", e.target.value)}
            />
            <input
              placeholder="Campaign type"
              value={coupon.campaignType}
              onChange={(e) => update("campaignType", e.target.value)}
            />
          </div>
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
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setCoupon(emptyCoupon());
                  navigate("/admin/coupons");
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
      <div className="coupon-admin-filters">
        <input
          aria-label="Search coupons"
          placeholder="Search code or name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label="Filter coupon status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <select
          aria-label="Filter coupon type"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="all">All types</option>
          {couponTypes.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-list">
        {filteredCoupons.map((item) => (
          <article className="admin-row" key={item._id}>
            <div>
              <strong>
                {item.code} · {item.title}
              </strong>
              <span>
                {typeLabels[item.type || item.discountType] || item.type} ·{" "}
                {discountLabel(item)} · Min {money(item.minimumOrderValue)}
              </span>
              <span>
                Usage {item.usedCount || 0}/{item.usageLimit ?? "Unlimited"} ·{" "}
                {new Date(item.startDate).toLocaleDateString()} –{" "}
                {new Date(item.expiryDate).toLocaleDateString()} · {item.status}
              </span>
              {expandedCoupon === item._id && (
                <span className="coupon-analytics">
                  {item.description || "No description"} · Remaining:{" "}
                  {item.usageRemaining ?? "Unlimited"} · Campaign:{" "}
                  {item.campaignName || "Standard"}
                  {couponAnalytics[item._id]?.analytics && (
                    <>
                      {" "}
                      · Successful:{" "}
                      {couponAnalytics[item._id].analytics.successfulUses} ·
                      Discount given:{" "}
                      {money(couponAnalytics[item._id].analytics.totalDiscount)}{" "}
                      · Shipping discount:{" "}
                      {money(
                        couponAnalytics[item._id].analytics
                          .totalShippingDiscount,
                      )}{" "}
                      · Revenue:{" "}
                      {money(couponAnalytics[item._id].analytics.revenue)} ·
                      Average order:{" "}
                      {money(
                        couponAnalytics[item._id].analytics.averageOrderValue,
                      )}{" "}
                      · Last used:{" "}
                      {couponAnalytics[item._id].analytics.lastUsed
                        ? new Date(
                            couponAnalytics[item._id].analytics.lastUsed,
                          ).toLocaleDateString()
                        : "Never"}
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="row-actions">
              <button
                title="View coupon details"
                onClick={() => showCouponDetails(item)}
              >
                <BarChart3 size={16} />
              </button>
              <button
                title={item.isActive ? "Deactivate" : "Activate"}
                onClick={() => toggleCoupon(item)}
              >
                <span>{item.isActive ? "On" : "Off"}</span>
              </button>
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
