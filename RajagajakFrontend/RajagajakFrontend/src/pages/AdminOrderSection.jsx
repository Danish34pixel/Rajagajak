import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as api from "../services/api.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const labels = {
  received: "Order received",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function AdminOrderSection({ orders, reload, setError }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const visibleOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return orders
      .filter((order) => {
        const haystack = [
          order.orderNumber,
          order.userId?.name,
          order.userId?.mobile,
        ]
          .join(" ")
          .toLowerCase();
        return (
          (!normalized || haystack.includes(normalized)) &&
          (!status || order.orderStatus === status)
        );
      })
      .sort((first, second) => {
        if (sort === "oldest")
          return new Date(first.createdAt) - new Date(second.createdAt);
        if (sort === "highest")
          return second.pricing.grandTotal - first.pricing.grandTotal;
        if (sort === "lowest")
          return first.pricing.grandTotal - second.pricing.grandTotal;
        return new Date(second.createdAt) - new Date(first.createdAt);
      });
  }, [orders, query, sort, status]);
  const update = async (id, status) => {
    try {
      await api.updateOrderStatus(id, status);
      await reload();
    } catch (error) {
      setError(error.message);
    }
  };
  const cancel = async (id) => {
    const reason = window.prompt("Optional cancellation reason", "") ?? null;
    if (reason === null) return;
    try {
      await api.cancelAdminOrder(id, reason);
      await reload();
    } catch (error) {
      setError(error.message);
    }
  };
  return (
    <section className="admin-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Fulfilment</span>
          <h2>Orders</h2>
        </div>
      </div>
      <div className="order-admin-stats">
        <strong>{orders.length} total orders</strong>
        <span>
          {money(
            orders.reduce((sum, order) => sum + order.pricing.grandTotal, 0),
          )}{" "}
          sales
        </span>
        <span>
          {money(
            orders.reduce((sum, order) => sum + order.pricing.totalGST, 0),
          )}{" "}
          GST
        </span>
      </div>
      <div className="order-filters">
        <input
          placeholder="Search order, customer, mobile"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All statuses</option>
          {Object.entries(labels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highest">Highest amount</option>
          <option value="lowest">Lowest amount</option>
        </select>
      </div>
      <div className="admin-list">
        {visibleOrders.map((order) => (
          <article className="admin-row admin-order-row" key={order._id}>
            <div>
              <strong>#{order.orderNumber}</strong>
              <span>
                {order.userId?.name || "Customer"} · {order.items.length} items
                · {new Date(order.createdAt).toLocaleDateString("en-IN")}
              </span>
              <span>
                GST {money(order.pricing.totalGST)} · Total{" "}
                {money(order.pricing.grandTotal)}
              </span>
              <span>
                {order.items
                  .map((item) => `${item.productName} · ${item.quantityKg} KG`)
                  .join(" · ")}
              </span>
            </div>
            <div className="row-actions">
              <span className={`order-status status-${order.orderStatus}`}>
                {labels[order.orderStatus]}
              </span>
              <Link
                className="outline-action"
                to={`/admin/orders/${order._id}`}
              >
                View
              </Link>
              {order.orderStatus === "received" && (
                <button
                  type="button"
                  onClick={() => update(order._id, "confirmed")}
                >
                  Confirm
                </button>
              )}
              {order.orderStatus === "confirmed" && (
                <button
                  type="button"
                  onClick={() => update(order._id, "shipped")}
                >
                  Ship
                </button>
              )}
              {order.orderStatus === "shipped" && (
                <button
                  type="button"
                  onClick={() => update(order._id, "delivered")}
                >
                  Deliver
                </button>
              )}
              {["received", "confirmed"].includes(order.orderStatus) && (
                <button type="button" onClick={() => cancel(order._id)}>
                  Cancel
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
