import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import * as api from "../services/api.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const statuses = ["received", "confirmed", "shipped", "delivered"];
const labels = {
  received: "Order received",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const load = useCallback(
    () =>
      api
        .myOrder(id)
        .then((response) => setOrder(response.data))
        .catch((requestError) => setError(requestError.message)),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);
  const cancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    setCancelling(true);
    try {
      await api.cancelOrder(id, reason);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setCancelling(false);
    }
  };
  if (!order)
    return (
      <div className="app-shell">
        <Navbar />
        <main className="dashboard">
          {error ? (
            <div className="alert">{error}</div>
          ) : (
            <p className="section-subtitle">Loading order...</p>
          )}
        </main>
      </div>
    );
  const currentIndex = statuses.indexOf(order.orderStatus);
  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard order-details-page">
        <Link className="back-link" to="/orders">
          Back to orders
        </Link>
        <div className="page-heading">
          <div>
            <span className="eyebrow">#{order.orderNumber}</span>
            <h1>Order details.</h1>
            <p>{new Date(order.createdAt).toLocaleString("en-IN")}</p>
          </div>
          <span className={`order-status status-${order.orderStatus}`}>
            {labels[order.orderStatus]}
          </span>
        </div>
        {order.orderStatus === "cancelled" ? (
          <div className="order-cancelled">
            Order cancelled
            {order.cancellationReason && `: ${order.cancellationReason}`}
          </div>
        ) : (
          <div className="order-timeline">
            {statuses.map((status, index) => (
              <div
                className={
                  index <= currentIndex
                    ? "timeline-step active"
                    : "timeline-step"
                }
                key={status}
              >
                <b>{index <= currentIndex ? "✓" : "○"}</b>
                <span>{labels[status]}</span>
              </div>
            ))}
          </div>
        )}
        <section className="order-detail-layout">
          <div className="checkout-card">
            <h2>Products</h2>
            {order.items.map((item) => (
              <div className="checkout-item" key={String(item.productId)}>
                <div className="bag-item-image">
                  {item.image && (
                    <img src={item.image} alt={item.productName} />
                  )}
                </div>
                <div>
                  <strong>{item.productName}</strong>
                  <span>
                    Quantity {item.quantityKg} KG · {money(item.pricePerKg)}/kg
                  </span>
                  <span>
                    GST {item.gstPercentage}% · {money(item.gstAmount)}
                  </span>
                </div>
                <strong>{money(item.itemTotal)}</strong>
              </div>
            ))}
            <h2>Delivery address</h2>
            <p>
              {order.shippingAddress.name}
              <br />
              {order.shippingAddress.mobile}
              <br />
              {order.shippingAddress.address}, {order.shippingAddress.city},{" "}
              {order.shippingAddress.state} - {order.shippingAddress.pincode}
            </p>
          </div>
          <aside className="checkout-card checkout-summary">
            <h2>Price details</h2>
            <div>
              <span>Subtotal</span>
              <strong>{money(order.pricing.subtotal)}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>-{money(order.pricing.discount)}</strong>
            </div>
            <div>
              <span>Taxable amount</span>
              <strong>{money(order.pricing.taxableAmount)}</strong>
            </div>
            <div>
              <span>GST</span>
              <strong>{money(order.pricing.totalGST)}</strong>
            </div>
            <div>
              <span>Shipping</span>
              <strong>{money(order.pricing.shippingCharges)}</strong>
            </div>
            <hr />
            <div className="grand-total">
              <span>Grand total</span>
              <strong>{money(order.pricing.grandTotal)}</strong>
            </div>
            {["received", "confirmed"].includes(order.orderStatus) && (
              <>
                <textarea
                  placeholder="Optional cancellation reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <button
                  className="outline-action"
                  type="button"
                  disabled={cancelling}
                  onClick={cancel}
                >
                  {cancelling ? "Cancelling..." : "Cancel order"}
                </button>
              </>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
