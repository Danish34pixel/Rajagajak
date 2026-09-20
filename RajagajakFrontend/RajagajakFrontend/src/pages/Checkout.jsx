import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/useCart.js";
import { useAuth } from "../context/useAuth.js";
import * as api from "../services/api.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
export default function Checkout() {
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState({
    name: user?.name || "",
    mobile: user?.mobile || "",
    address: user?.address || "",
    city: "",
    state: "",
    pincode: user?.pinCode || "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [couponError, setCouponError] = useState("");
  const [selectedCouponCode, setSelectedCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponWindowOpen, setCouponWindowOpen] = useState(false);
  const cartKey = cartItems
    .map((item) => `${item.productId}:${item.quantityKg}`)
    .join("|");
  const [quoteResult, setQuoteResult] = useState(null);
  const [quoteFailure, setQuoteFailure] = useState(null);
  const quote = quoteResult?.key === cartKey ? quoteResult.data : null;
  const quoteError = quoteFailure?.key === cartKey ? quoteFailure.message : "";

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
    setQuoteResult(null);
    setQuoteFailure(null);
    setAppliedCoupon(null);
    setApplyingCoupon(false);
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
    if (!selectedCouponCode || !quote) {
      if (!selectedCouponCode) {
        setAppliedCoupon(null);
        setCouponError("");
      }
      return;
    }

    const subtotal = Number(quote.pricing?.subtotal || 0);
    if (!subtotal) return;

    let active = true;
    setApplyingCoupon(true);
    setCouponError("");
    api
      .applyCoupon(selectedCouponCode, subtotal)
      .then((response) => {
        if (active) {
          setAppliedCoupon(response.data);
          setCouponWindowOpen(false);
        }
      })
      .catch((requestError) => {
        if (active) {
          setAppliedCoupon(null);
          setCouponError(requestError.message || "Unable to apply coupon.");
        }
      })
      .finally(() => {
        if (active) setApplyingCoupon(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCouponCode, quote, cartKey]);
  const subtotal = Number(quote?.pricing?.subtotal || 0);
  const couponDiscount = appliedCoupon
    ? Math.min(Math.max(0, Number(appliedCoupon.discount || 0)), subtotal)
    : 0;
  const selectedCoupon = coupons.find(
    (coupon) => coupon.code === selectedCouponCode,
  );
  const baseTaxableAmount = Number(quote?.pricing?.taxableAmount || 0);
  const shippingCharges = Number(quote?.pricing?.shippingCharges || 0);
  const discountedTaxableAmount = Math.max(
    0,
    baseTaxableAmount - couponDiscount,
  );
  const currentGrandTotal =
    quote && Number.isFinite(Number(quote.pricing?.grandTotal))
      ? Math.max(0, Number(quote.pricing.grandTotal) - couponDiscount)
      : 0;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!cartItems.length) return setError("Your bag is empty.");
    setSubmitting(true);
    try {
      const response = await api.createOrder({
        clientRequestId: crypto.randomUUID(),
        shippingAddress: address,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantityKg: item.quantityKg,
        })),
        couponCode: selectedCouponCode || undefined,
      });
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
            <h2>Delivery address</h2>
            <div className="checkout-fields">
              <input
                required
                placeholder="Full name"
                value={address.name}
                onChange={(event) =>
                  setAddress({ ...address, name: event.target.value })
                }
              />
              <input
                required
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                placeholder="Mobile number"
                value={address.mobile}
                onChange={(event) =>
                  setAddress({ ...address, mobile: event.target.value })
                }
              />
              <textarea
                required
                placeholder="Address"
                value={address.address}
                onChange={(event) =>
                  setAddress({ ...address, address: event.target.value })
                }
              />
              <input
                required
                placeholder="City"
                value={address.city}
                onChange={(event) =>
                  setAddress({ ...address, city: event.target.value })
                }
              />
              <input
                required
                placeholder="State"
                value={address.state}
                onChange={(event) =>
                  setAddress({ ...address, state: event.target.value })
                }
              />
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                placeholder="Pincode"
                value={address.pincode}
                onChange={(event) =>
                  setAddress({ ...address, pincode: event.target.value })
                }
              />
            </div>
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
                {selectedCouponCode && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setSelectedCouponCode("");
                      setAppliedCoupon(null);
                      setCouponError("");
                      setApplyingCoupon(false);
                    }}
                  >
                    Remove
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
                      ? `${appliedCoupon.coupon} saved ${money(couponDiscount)}`
                      : "Choose from available offers"}
                  </small>
                </span>
                <span aria-hidden="true">›</span>
              </button>
              {appliedCoupon && selectedCoupon && (
                <div className="selected-coupon-pill">
                  {selectedCoupon.discountType === "percentage"
                    ? `${selectedCoupon.discountValue}% discount applied`
                    : `${money(selectedCoupon.discountValue)} discount applied`}{" "}
                  · Save {money(couponDiscount)}
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
                              setSelectedCouponCode(coupon.code);
                            }}
                          >
                            <span className="coupon-code">{coupon.code}</span>
                            <span className="coupon-title">{coupon.title}</span>
                            <span className="coupon-meta">
                              {coupon.discountType === "percentage"
                                ? `${coupon.discountValue}% OFF`
                                : `${money(coupon.discountValue)} OFF`}{" "}
                              · Min {money(coupon.minimumOrderValue || 0)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {applyingCoupon && (
                    <p className="muted-copy">Applying coupon...</p>
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
            {appliedCoupon && (
              <div className="coupon-discount-row">
                <span>
                  Coupon discount
                  {selectedCoupon?.discountType === "percentage" &&
                    ` (${selectedCoupon.discountValue}%)`}
                </span>
                <strong>-{money(couponDiscount)}</strong>
              </div>
            )}
            <div>
              <span>Taxable amount</span>
              <strong>{money(discountedTaxableAmount)}</strong>
            </div>
            <div>
              <span>GST</span>
              <strong>{money(quote?.pricing.totalGST)}</strong>
            </div>
            <div>
              <span>Shipping</span>
              <strong>{money(shippingCharges)}</strong>
            </div>
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
              disabled={submitting || !quote}
            >
              {submitting ? "Placing order..." : "Place order"}
            </button>
          </aside>
        </form>
      </main>
    </div>
  );
}
