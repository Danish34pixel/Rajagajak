import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .myOrders()
      .then((response) => setOrders(response.data))
      .catch((requestError) => setError(requestError.message));
  }, []);
  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard orders-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Your account</span>
            <h1>My orders.</h1>
            <p>Track your Rajagajak purchases.</p>
          </div>
        </div>
        {error && <div className="alert">{error}</div>}
        {!error && orders.length === 0 && (
          <p className="section-subtitle">You have not placed an order yet.</p>
        )}
        <div className="orders-list">
          {orders.map((order) => (
            <article className="order-card" key={order._id}>
              <div>
                <span className="eyebrow">#{order.orderNumber}</span>
                <h2>
                  {order.items.length}{" "}
                  {order.items.length === 1 ? "item" : "items"}
                </h2>
                <p>{new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
              </div>
              <div>
                <strong>{money(order.pricing.grandTotal)}</strong>
                <span className={`order-status status-${order.orderStatus}`}>
                  {labels[order.orderStatus]}
                </span>
              </div>
              <Link className="outline-action" to={`/orders/${order._id}`}>
                View order
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
