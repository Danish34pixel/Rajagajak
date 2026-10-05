import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { useAuth } from "../context/useAuth.js";
import * as api from "../services/api.js";

const statusLabels = {
  received: "received",
  confirmed: "confirmed",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
};

export default function OrderStatusNotification() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const shownIds = useRef(new Set());
  const userId = String(user?._id || user?.id || "");

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;

    const pollNotifications = async () => {
      try {
        const response = await api.orderStatusNotifications();
        if (!active) return;
        const nextNotification = response.data?.find(
          (item) => !shownIds.current.has(String(item._id)),
        );
        if (!nextNotification) return;
        setNotification((current) => {
          if (current?.recipientId === userId) return current;
          shownIds.current.add(String(nextNotification._id));
          return { ...nextNotification, recipientId: userId };
        });
      } catch {
        // Notifications can be retried on the next poll.
      }
    };

    pollNotifications();
    const interval = window.setInterval(pollNotifications, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [userId]);

  const dismiss = async () => {
    if (!notification) return;
    const current = notification;
    setNotification(null);
    try {
      await api.markOrderStatusNotificationRead(current._id);
    } catch {
      // Keep the popup dismissed for this session; it can reappear after reload.
    }
  };

  const viewOrder = async () => {
    if (!notification) return;
    const orderPath = `/orders/${notification.orderId}`;
    await dismiss();
    navigate(orderPath);
  };

  if (!userId || notification?.recipientId !== userId) return null;

  return (
    <aside className="order-status-notice" role="status" aria-live="polite">
      <div className="order-status-notice-heading">
        <span className="order-status-notice-icon">
          <Bell size={18} aria-hidden="true" />
        </span>
        <div>
          <strong>Order update</strong>
          <span>#{notification.orderNumber}</span>
        </div>
        <button
          className="order-status-notice-close"
          type="button"
          onClick={dismiss}
          aria-label="Dismiss order update"
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>
      <p>
        Your order is now{" "}
        {statusLabels[notification.status] || notification.status}.
      </p>
      <div className="order-status-notice-actions">
        <button className="primary-action" type="button" onClick={viewOrder}>
          View order
        </button>
        <Link className="outline-action" to="/orders" onClick={dismiss}>
          My orders
        </Link>
      </div>
    </aside>
  );
}
