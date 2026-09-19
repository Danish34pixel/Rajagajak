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
  const cartKey = cartItems
    .map((item) => `${item.productId}:${item.quantityKg}`)
    .join("|");
  const [quoteResult, setQuoteResult] = useState(null);
  const [quoteFailure, setQuoteFailure] = useState(null);

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

  const quote = quoteResult?.key === cartKey ? quoteResult.data : null;
  const quoteError = quoteFailure?.key === cartKey ? quoteFailure.message : "";

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
            <div>
              <span>Subtotal</span>
              <strong>{money(quote?.pricing.subtotal)}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>-{money(quote?.pricing.discount)}</strong>
            </div>
            <div>
              <span>Taxable amount</span>
              <strong>{money(quote?.pricing.taxableAmount)}</strong>
            </div>
            <div>
              <span>GST</span>
              <strong>{money(quote?.pricing.totalGST)}</strong>
            </div>
            <div>
              <span>Shipping</span>
              <strong>₹0</strong>
            </div>
            <hr />
            <div className="grand-total">
              <span>Grand total</span>
              <strong>{money(quote?.pricing.grandTotal)}</strong>
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
