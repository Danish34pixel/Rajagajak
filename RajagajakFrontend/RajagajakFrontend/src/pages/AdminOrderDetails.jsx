import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import * as api from "../services/api.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const labels = {
  received: "Order received",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const next = {
  received: "confirmed",
  confirmed: "shipped",
  shipped: "delivered",
};

export default function AdminOrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      api
        .adminOrder(id)
        .then((response) => setOrder(response.data))
        .catch((requestError) => setError(requestError.message)),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);
  const update = async (status) => {
    try {
      await api.updateOrderStatus(id, status);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  const cancel = async () => {
    const reason = window.prompt("Optional cancellation reason", "");
    if (reason === null) return;
    try {
      await api.cancelAdminOrder(id, reason);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };
  if (!order)
    return (
      <div className="app-shell">
        <Navbar admin />
        <main className="dashboard">
          {error ? (
            <div className="alert">{error}</div>
          ) : (
            <p className="section-subtitle">Loading order...</p>
          )}
        </main>
      </div>
    );
  return (
    <div className="app-shell">
      <Navbar admin />
      <main className="dashboard order-details-page">
        <Link className="back-link" to="/admin/orders">
          Back to admin orders
        </Link>
        <div className="page-heading">
          <div>
            <span className="eyebrow">#{order.orderNumber}</span>
            <h1>Order details.</h1>
            <p>
              {order.userId?.name} · {order.userId?.mobile}
            </p>
          </div>
          <span className={`order-status status-${order.orderStatus}`}>
            {labels[order.orderStatus]}
          </span>
        </div>
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
                    MRP {money(item.mrpPerKg)}/kg · Discount{" "}
                    {item.discountPercentage}%
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
              {order.shippingAddress.name} · {order.shippingAddress.mobile}
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
            <p>
              Payment: {order.paymentStatus} · {order.paymentMethod}
            </p>
            {next[order.orderStatus] && (
              <button
                className="primary-action"
                type="button"
                onClick={() => update(next[order.orderStatus])}
              >
                Mark {labels[next[order.orderStatus]]}
              </button>
            )}
            {["received", "confirmed"].includes(order.orderStatus) && (
              <button className="outline-action" type="button" onClick={cancel}>
                Cancel order
              </button>
            )}
            {order.cancellationReason && (
              <p>Cancellation reason: {order.cancellationReason}</p>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
