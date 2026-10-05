import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PencilLine, X } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/useCart.js";
import { useAuth } from "../context/useAuth.js";
import * as api from "../services/api.js";
import { calculateCheckoutGrandTotal } from "../utils/checkoutPricing.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const CHECKOUT_DRAFT_KEY = "rajagajak_checkout_draft";

const readCheckoutDraft = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CHECKOUT_DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
};

const deliveryAddressPayload = (address) => ({
  name: address.name,
  mobile: address.mobile,
  address: address.houseShop,
  fullAddress: address.fullAddress || "",
  building: address.building || "",
  houseNumber: address.houseNumber || "",
  road: address.road || "",
  locality: address.locality || "",
  district: address.district || "",
  area: address.area,
  city: address.city,
  state: address.state,
  pincode: address.pincode,
  country: address.country || "",
  latitude: address.latitude,
  longitude: address.longitude,
  locationDetected: Boolean(address.locationDetected),
  locationSource: address.locationDetected ? "gps" : "manual",
});

const getCurrentLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });

export default function Checkout() {
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState(() => {
    const draft = readCheckoutDraft();
    const profileAddress = {
      name: user?.name || "",
      mobile: user?.mobile || "",
      houseShop: user?.address || "",
      area: "",
      city: "",
      state: "",
      pincode: user?.pinCode || "",
    };
    return draft.address
      ? {
          ...profileAddress,
          ...draft.address,
          name: draft.address.name || profileAddress.name,
          mobile: draft.address.mobile || profileAddress.mobile,
        }
      : profileAddress;
  });
  const [deliveryMode, setDeliveryMode] = useState(
    () => readCheckoutDraft().deliveryMode || "",
  );
  const [manualAddressOpen, setManualAddressOpen] = useState(false);
  const [customerLocation, setCustomerLocation] = useState(
    () => readCheckoutDraft().customerLocation || null,
  );
  const [deliveryQuote, setDeliveryQuote] = useState(null);
  const [deliveryError, setDeliveryError] = useState("");
  const [deliveryCalculating, setDeliveryCalculating] = useState(() => {
    const draft = readCheckoutDraft();
    return draft.deliveryMode === "gps" && Boolean(draft.customerLocation);
  });
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [couponError, setCouponError] = useState("");
  const [selectedCouponCode, setSelectedCouponCode] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCouponResult, setAppliedCouponResult] = useState(null);
  const [couponWindowOpen, setCouponWindowOpen] = useState(false);
  const cartKey = cartItems
    .map((item) => `${item.productId}:${item.quantityKg}`)
    .join("|");
  const [quoteResult, setQuoteResult] = useState(null);
  const [quoteFailure, setQuoteFailure] = useState(null);
  const quote = quoteResult?.key === cartKey ? quoteResult.data : null;
  const quoteError = quoteFailure?.key === cartKey ? quoteFailure.message : "";
  const appliedCoupon =
    appliedCouponResult?.key === cartKey ? appliedCouponResult.data : null;

  useEffect(() => {
    sessionStorage.setItem(
      CHECKOUT_DRAFT_KEY,
      JSON.stringify({ address, deliveryMode, customerLocation }),
    );
  }, [address, deliveryMode, customerLocation]);

  useEffect(() => {
    let active = true;
    api
      .activeCoupons()
      .then((response) => {
        if (active) setCoupons(response.data || []);
      })
      .catch(() => {
        if (active) setCoupons([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!cartItems.length) return undefined;
    api
      .quoteOrder(
        cartItems.map((item) => ({
          productId: item.productId,
          quantityKg: item.quantityKg,
        })),
      )
      .then((response) => {
        if (active) setQuoteResult({ key: cartKey, data: response.data });
      })
      .catch((requestError) => {
        if (active) {
          setQuoteFailure({
            key: cartKey,
            message: requestError.message || "Unable to price your order.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [cartItems, cartKey]);

  useEffect(() => {
    if (deliveryMode !== "gps" || !customerLocation) return undefined;

    let active = true;
    api
      .quoteShipping({
        customerLocation: {
          latitude: customerLocation.latitude,
          longitude: customerLocation.longitude,
        },
      })
      .then((response) => {
        if (!active) return;
        const shipping = response.data.shipping;
        const location = shipping.location || {};
        if (!shipping.fullAddress || !location.city || !location.state)
          throw new Error(
            "We couldn't get a readable address for your current location.",
          );
        setAddress((current) => ({
          ...current,
          houseShop: [location.building, location.houseNumber, location.road]
            .filter(Boolean)
            .join(", "),
          fullAddress: shipping.fullAddress,
          building: location.building || "",
          houseNumber: location.houseNumber || "",
          road: location.road || "",
          locality: location.locality || "",
          district: location.district || "",
          area: [location.locality, location.area, location.district]
            .filter(Boolean)
            .join(", "),
          city: location.city,
          state: location.state,
          pincode: location.pincode || "",
          country: location.country || "",
          latitude: customerLocation.latitude,
          longitude: customerLocation.longitude,
          locationDetected: true,
        }));
        setDeliveryQuote(shipping);
      })
      .catch((requestError) => {
        if (active) {
          setDeliveryQuote(null);
          setDeliveryMode("");
          setDeliveryError(
            requestError.message ||
              "We couldn't get a readable address for your current location. Please enter your delivery address manually.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setDeliveryCalculating(false);
          setGettingLocation(false);
        }
      });

    return () => {
      active = false;
    };
  }, [deliveryMode, customerLocation]);

  const updateAddress = (field, value) => {
    removeCoupon();
    setAddress((current) => ({
      ...current,
      [field]: value,
      fullAddress: "",
      building: "",
      latitude: undefined,
      longitude: undefined,
      locationDetected: false,
    }));
    setDeliveryMode("address");
    setCustomerLocation(null);
    setDeliveryQuote(null);
    setDeliveryError("");
    setDeliveryCalculating(false);
  };

  const toggleManualAddress = () => {
    if (manualAddressOpen) {
      setManualAddressOpen(false);
      return;
    }
    setDeliveryQuote(null);
    setDeliveryError("");
    setDeliveryMode("address");
    setCustomerLocation(null);
    setAddress((current) => ({
      ...current,
      fullAddress: "",
      building: "",
      latitude: undefined,
      longitude: undefined,
      locationDetected: false,
    }));
    setDeliveryCalculating(false);
    removeCoupon();
    setManualAddressOpen(true);
  };

  const editManualAddress = () => {
    removeCoupon();
    setDeliveryQuote(null);
    setDeliveryError("");
    setDeliveryMode("address");
    setCustomerLocation(null);
    setAddress((current) => ({
      ...current,
      fullAddress: "",
      locationDetected: false,
    }));
    setManualAddressOpen(true);
  };

  const calculateManualDelivery = async () => {
    setDeliveryError("");
    if (
      !address.name.trim() ||
      !address.houseShop.trim() ||
      !address.area.trim() ||
      !address.city.trim() ||
      !address.state.trim()
    ) {
      setDeliveryError("Please enter a valid delivery address.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(address.mobile.trim())) {
      setDeliveryError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!/^\d{6}$/.test(address.pincode.trim())) {
      setDeliveryError("Please enter a valid 6-digit pincode.");
      return;
    }

    setDeliveryCalculating(true);
    setDeliveryQuote(null);
    setDeliveryMode("address");
    setCustomerLocation(null);
    try {
      const response = await api.quoteShipping({
        shippingAddress: {
          address: address.houseShop,
          area: address.area,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        },
      });
      setDeliveryQuote(response.data.shipping);
      setAddress((current) => ({
        ...current,
        fullAddress: [
          current.houseShop,
          current.area,
          current.city,
          `${current.state} - ${current.pincode}`,
        ]
          .filter(Boolean)
          .join(", "),
        locationDetected: false,
      }));
      setManualAddressOpen(false);
    } catch (requestError) {
      setDeliveryError(
        requestError.message === "We couldn't find that delivery address."
          ? "Couldn't find this address. Please check your address and try again."
          : requestError.message ||
              "We couldn't calculate delivery charges. Please try again or enter your delivery address.",
      );
    } finally {
      setDeliveryCalculating(false);
    }
  };

  const useDeviceLocation = async () => {
    removeCoupon();
    setGettingLocation(true);
    setManualAddressOpen(false);
    setDeliveryMode("");
    setCustomerLocation(null);
    setDeliveryQuote(null);
    setDeliveryError("");
    setDeliveryCalculating(true);
    try {
      const location = await getCurrentLocation();
      setCustomerLocation(location);
      setDeliveryMode("gps");
    } catch (locationError) {
      setDeliveryMode("");
      setManualAddressOpen(true);
      setGettingLocation(false);
      setDeliveryCalculating(false);
      setDeliveryError(
        locationError.code === 1
          ? "Location permission was denied. Please enter your delivery address manually."
          : "Unable to detect your location. Please enter your delivery address manually.",
      );
    }
  };

  const applyCouponCode = async (requestedCode = couponInput) => {
    const code = String(requestedCode || "")
      .trim()
      .toUpperCase();
    if (!code) return setCouponError("Enter a coupon code.");
    if (!quote || !deliveryQuote)
      return setCouponError(
        "Calculate delivery charges before applying a coupon.",
      );
    setApplyingCoupon(true);
    setCouponError("");
    try {
      const response = await api.applyCoupon(code, {
        cartItems: cartItems.map(({ productId, quantityKg }) => ({
          productId,
          quantityKg,
        })),
        deliveryAddress: deliveryAddressPayload(address),
        ...(deliveryMode === "gps" ? { customerLocation } : {}),
        paymentMethod: "cod",
      });
      setAppliedCouponResult({ key: cartKey, data: response.data });
      setSelectedCouponCode(response.data.coupon.code);
      setCouponInput(response.data.coupon.code);
      setCouponWindowOpen(false);
    } catch (requestError) {
      setAppliedCouponResult(null);
      setSelectedCouponCode("");
      setCouponError(requestError.message || "Unable to apply coupon.");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setSelectedCouponCode("");
    setCouponInput("");
    setAppliedCouponResult(null);
    setCouponError("");
  };

  const subtotal = Number(quote?.pricing?.subtotal || 0);
  const couponDiscount = appliedCoupon
    ? Math.min(Math.max(0, Number(appliedCoupon.discount || 0)), subtotal)
    : 0;
  const baseTaxableAmount = Number(quote?.pricing?.taxableAmount || 0);
  const shippingCharges = Number(
    appliedCoupon?.finalShipping ?? deliveryQuote?.shippingCharge ?? 0,
  );
  const shippingDiscount = Number(appliedCoupon?.shippingDiscount || 0);
  const discountedTaxableAmount = Number(
    appliedCoupon?.pricing?.taxableAmount ??
      Math.max(0, baseTaxableAmount - couponDiscount),
  );
  const currentGrandTotal = calculateCheckoutGrandTotal({
    taxableAmount: baseTaxableAmount,
    couponDiscount,
    gstAmount: appliedCoupon?.pricing?.totalGST ?? quote?.pricing?.totalGST,
    shippingCharge: shippingCharges,
  });

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!cartItems.length) return setError("Your bag is empty.");
    if (!user) {
      navigate("/login", {
        state: { from: { pathname: "/checkout" } },
      });
      return;
    }
    const gpsAddressReady =
      deliveryMode === "gps" &&
      address.locationDetected &&
      Boolean(address.fullAddress) &&
      Boolean(customerLocation);
    if (
      !address.name.trim() ||
      !/^[6-9]\d{9}$/.test(address.mobile.trim()) ||
      (!gpsAddressReady &&
        (!address.houseShop.trim() ||
          !address.area.trim() ||
          !address.city.trim() ||
          !address.state.trim()))
    )
      return setError("Please enter a valid delivery address.");
    if (!gpsAddressReady && !/^\d{6}$/.test(address.pincode.trim()))
      return setError("Please enter a valid 6-digit pincode.");
    if (deliveryMode === "address") {
      if (!deliveryQuote)
        return setError(
          "Couldn't find this address. Please check your address and try again.",
        );
    }
    if (!deliveryQuote)
      return setError(
        "We couldn't calculate delivery charges. Please try again or enter your delivery address.",
      );
    setSubmitting(true);
    try {
      const response = await api.createOrder({
        clientRequestId: crypto.randomUUID(),
        shippingAddress: deliveryAddressPayload(address),
        ...(deliveryMode === "gps" ? { customerLocation } : {}),
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantityKg: item.quantityKg,
        })),
        couponCode: appliedCoupon?.coupon?.code || undefined,
      });
      sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
      clearCart();
      navigate(`/order-success/${response.data._id}`, {
        state: { order: response.data },
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to place your order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!cartItems.length && !submitting)
    return (
      <div className="app-shell">
        <Navbar />
        <main className="dashboard">
          <div className="alert">
            Your bag is empty. <Link to="/dashboard">Browse products</Link>
          </div>
        </main>
      </div>
    );
  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard checkout-page">
        <Link className="back-link" to="/bag">
          Back to bag
        </Link>
        <div className="page-heading">
          <div>
            <span className="eyebrow">Secure order</span>
            <h1>Checkout.</h1>
            <p>Confirm your delivery details and price breakdown.</p>
          </div>
        </div>
        {error && <div className="alert">{error}</div>}
        {quoteError && <div className="alert">{quoteError}</div>}
        <form className="checkout-layout" onSubmit={submit}>
          <section className="checkout-card">
            <h2>Delivery Location</h2>
            <div className="delivery-location-actions">
              <button
                className="outline-action"
                type="button"
                disabled={gettingLocation || deliveryCalculating}
                onClick={useDeviceLocation}
              >
                {gettingLocation
                  ? "Detecting your location..."
                  : "📍 Use My Current Location"}
              </button>
              <span>OR</span>
              <button
                className="outline-action"
                type="button"
                disabled={gettingLocation || deliveryCalculating}
                aria-expanded={manualAddressOpen}
                onClick={
                  deliveryMode === "gps" && address.locationDetected
                    ? editManualAddress
                    : toggleManualAddress
                }
              >
                {manualAddressOpen
                  ? "Cancel address entry"
                  : deliveryMode === "gps" && address.locationDetected
                    ? "Change Address"
                    : "Enter a delivery address"}
              </button>
            </div>
            {deliveryCalculating && (
              <p className="delivery-location-status">
                Calculating delivery charges...
              </p>
            )}
            {deliveryError && (
              <div className="alert alert-inline">{deliveryError}</div>
            )}
            {deliveryQuote && (
              <div className="delivery-quote">
                {((deliveryMode === "address" && !manualAddressOpen) ||
                  (deliveryMode === "gps" && address.locationDetected)) && (
                  <div className="delivery-quote-address">
                    <div>
                      <strong>
                        {deliveryMode === "gps"
                          ? "✓ Delivery location detected"
                          : "Delivery address confirmed"}
                      </strong>
                      <motion.button
                        className="edit-address-action"
                        type="button"
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={editManualAddress}
                      >
                        <PencilLine size={15} aria-hidden="true" />
                        <span>Change Address</span>
                      </motion.button>
                    </div>
                    {address.name && <span>{address.name}</span>}
                    {address.mobile && <span>{address.mobile}</span>}
                    <span>
                      {address.fullAddress ||
                        `${address.houseShop}, ${address.area}, ${address.city}, ${address.state} - ${address.pincode}`}
                    </span>
                  </div>
                )}
                <div>
                  <span>Delivery Distance</span>
                  <strong>
                    {Number(deliveryQuote.distanceKm).toFixed(1)} KM
                  </strong>
                </div>
                <div>
                  <span>Shipping Charges</span>
                  <strong>{money(deliveryQuote.shippingCharge)}</strong>
                </div>
                {deliveryQuote.distanceMethod === "haversine" && (
                  <small>
                    Road routing is unavailable; showing an approximate direct
                    distance.
                  </small>
                )}
                {deliveryQuote.geocodingPrecision === "postcode" && (
                  <small>
                    Exact street match was unavailable; distance is estimated
                    from this postcode area.
                  </small>
                )}
              </div>
            )}
            <AnimatePresence initial={false}>
              {manualAddressOpen && (
                <motion.div
                  className="manual-address-panel"
                  initial={{ height: 0, opacity: 0, y: -8 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <h2>Delivery address</h2>
                  <fieldset
                    className="checkout-fields"
                    disabled={deliveryCalculating}
                  >
                    <input
                      required
                      placeholder="Full name"
                      value={address.name}
                      onChange={(event) =>
                        updateAddress("name", event.target.value)
                      }
                    />
                    <input
                      required
                      inputMode="numeric"
                      pattern="[6-9][0-9]{9}"
                      placeholder="Mobile number"
                      value={address.mobile}
                      onChange={(event) =>
                        updateAddress("mobile", event.target.value)
                      }
                    />
                    <input
                      required
                      placeholder="House/Shop No."
                      value={address.houseShop}
                      onChange={(event) =>
                        updateAddress("houseShop", event.target.value)
                      }
                    />
                    <input
                      required
                      placeholder="Area"
                      value={address.area}
                      onChange={(event) =>
                        updateAddress("area", event.target.value)
                      }
                    />
                    <input
                      required
                      placeholder="City"
                      value={address.city}
                      onChange={(event) =>
                        updateAddress("city", event.target.value)
                      }
                    />
                    <input
                      required
                      placeholder="State"
                      value={address.state}
                      onChange={(event) =>
                        updateAddress("state", event.target.value)
                      }
                    />
                    <input
                      required
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Pincode"
                      value={address.pincode}
                      onChange={(event) =>
                        updateAddress("pincode", event.target.value)
                      }
                    />
                    {deliveryMode === "address" &&
                      address.pincode &&
                      !/^\d{6}$/.test(address.pincode.trim()) && (
                        <span className="delivery-location-status">
                          Please enter a valid 6-digit pincode.
                        </span>
                      )}
                  </fieldset>
                  <button
                    className="primary-action calculate-delivery-action"
                    type="button"
                    disabled={deliveryCalculating || gettingLocation}
                    onClick={calculateManualDelivery}
                  >
                    {deliveryCalculating
                      ? "Calculating delivery charges..."
                      : "Confirm address"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <h2>Order items</h2>
            <div className="checkout-items">
              {(quote?.items || cartItems).map((item) => (
                <div
                  className="checkout-item"
                  key={item.itemKey || item.productId}
                >
                  <div className="bag-item-image">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.productName || item.title}
                      />
                    )}
                  </div>
                  <div>
                    <strong>{item.productName || item.title}</strong>
                    <span>
                      Price: {money(item.pricePerKg || item.unitPrice || 0)}/kg
                    </span>
                    <span>
                      Quantity {item.quantityKg} KG · GST{" "}
                      {item.gstPercentage || 0}% · {money(item.gstAmount || 0)}
                    </span>
                  </div>
                  <strong>
                    {money(
                      item.itemTotal ||
                        (item.pricePerKg || item.price) * item.quantityKg,
                    )}
                  </strong>
                </div>
              ))}
            </div>
          </section>
          <aside className="checkout-card checkout-summary">
            <h2>Price details</h2>
            {!quote && !quoteError && (
              <p>Refreshing prices from the catalogue...</p>
            )}

            <div className="coupon-box">
              <div className="coupon-box-header">
                <span>Coupons</span>
                {appliedCoupon && (
                  <button
                    type="button"
                    className="coupon-remove-action"
                    aria-label={`Remove ${appliedCoupon.coupon.code} coupon`}
                    onClick={removeCoupon}
                  >
                    <X size={14} aria-hidden="true" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                className="apply-coupon-trigger"
                onClick={() => setCouponWindowOpen(true)}
              >
                <span>
                  <strong>
                    {appliedCoupon ? "Coupon applied" : "Apply coupon"}
                  </strong>
                  <small>
                    {appliedCoupon
                      ? `${appliedCoupon.coupon.code} applied · saved ${money(couponDiscount + shippingDiscount)}`
                      : "Choose from available offers"}
                  </small>
                </span>
                <span aria-hidden="true">›</span>
              </button>
              {appliedCoupon && (
                <div className="selected-coupon-pill">
                  ✓ {appliedCoupon.coupon.code} applied · You saved{" "}
                  {money(couponDiscount + shippingDiscount)}
                </div>
              )}
              {couponError && (
                <div className="alert alert-inline">{couponError}</div>
              )}
            </div>

            {couponWindowOpen && (
              <div className="coupon-window-backdrop" role="presentation">
                <section
                  className="coupon-window"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="coupon-window-title"
                >
                  <div className="coupon-window-header">
                    <div>
                      <span className="eyebrow">Offers for you</span>
                      <h2 id="coupon-window-title">Apply coupon</h2>
                    </div>
                    <button
                      type="button"
                      className="coupon-window-close"
                      aria-label="Close coupons"
                      onClick={() => setCouponWindowOpen(false)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="coupon-code-entry">
                    <input
                      aria-label="Enter coupon code"
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(event) => {
                        setCouponInput(event.target.value.toUpperCase());
                        setCouponError("");
                      }}
                    />
                    <button
                      className="primary-action"
                      type="button"
                      disabled={applyingCoupon || !deliveryQuote || !quote}
                      onClick={() => applyCouponCode()}
                    >
                      {applyingCoupon ? "Applying..." : "Apply"}
                    </button>
                  </div>
                  {!deliveryQuote && (
                    <p className="muted-copy">
                      Calculate delivery before applying a coupon.
                    </p>
                  )}
                  {coupons.length === 0 ? (
                    <p className="muted-copy">
                      No coupons available right now.
                    </p>
                  ) : (
                    <div className="coupon-option-list">
                      {coupons.map((coupon) => {
                        const isSelected = selectedCouponCode === coupon.code;
                        return (
                          <button
                            key={coupon._id}
                            type="button"
                            className={`coupon-option ${isSelected ? "selected" : ""}`}
                            onClick={() => {
                              setCouponError("");
                              setCouponInput(coupon.code);
                            }}
                          >
                            <span className="coupon-code">{coupon.code}</span>
                            <span className="coupon-title">{coupon.title}</span>
                            <span className="coupon-meta">
                              {(coupon.type || coupon.discountType) ===
                              "percentage"
                                ? `${coupon.discountValue}% OFF`
                                : (coupon.type || coupon.discountType) ===
                                    "fixed"
                                  ? `${money(coupon.discountValue)} OFF`
                                  : (coupon.type || coupon.discountType) ===
                                      "free_shipping"
                                    ? "FREE SHIPPING"
                                    : (coupon.type || coupon.discountType) ===
                                        "fixed_shipping"
                                      ? `SHIPPING ${money(coupon.discountValue)}`
                                      : `${coupon.title}`}{" "}
                              · Min {money(coupon.minimumOrderValue || 0)} ·
                              Ends{" "}
                              {new Date(coupon.expiryDate).toLocaleDateString()}
                            </span>
                            {(coupon.applicableCategories?.length > 0 ||
                              coupon.applicableProducts?.length > 0) && (
                              <span className="coupon-meta">
                                Applies to:{" "}
                                {[
                                  ...(coupon.applicableCategories || []),
                                  ...(coupon.applicableProducts || []).map(
                                    (product) => product.title,
                                  ),
                                ].join(", ")}
                              </span>
                            )}
                            {coupon.eligibilityNotice && (
                              <span className="coupon-meta">
                                {coupon.eligibilityNotice}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {couponError && (
                    <div className="alert alert-inline">{couponError}</div>
                  )}
                </section>
              </div>
            )}

            <div>
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>-{money(quote?.pricing.discount || 0)}</strong>
            </div>
            {appliedCoupon && couponDiscount > 0 && (
              <div className="coupon-discount-row">
                <span>Coupon discount ({appliedCoupon.coupon.code})</span>
                <strong>-{money(couponDiscount)}</strong>
              </div>
            )}
            <div>
              <span>Taxable amount</span>
              <strong>{money(discountedTaxableAmount)}</strong>
            </div>
            <div>
              <span>GST</span>
              <strong>
                {money(
                  appliedCoupon?.pricing?.totalGST ?? quote?.pricing.totalGST,
                )}
              </strong>
            </div>
            <div>
              <span>Shipping</span>
              <strong>{money(shippingCharges)}</strong>
            </div>
            {shippingDiscount > 0 && (
              <div className="coupon-discount-row">
                <span>Shipping discount</span>
                <strong>-{money(shippingDiscount)}</strong>
              </div>
            )}
            <hr />
            <div className="grand-total">
              <span>Grand total</span>
              <strong>{money(currentGrandTotal)}</strong>
            </div>
            <p>
              Cash on delivery architecture is active. Online payment
              verification is not enabled.
            </p>
            <button
              className="primary-action"
              type="submit"
              disabled={
                submitting ||
                !quote ||
                !deliveryQuote ||
                deliveryCalculating ||
                gettingLocation
              }
            >
              {submitting ? "Placing order..." : "Place order"}
            </button>
          </aside>
        </form>
      </main>
    </div>
  );
}
