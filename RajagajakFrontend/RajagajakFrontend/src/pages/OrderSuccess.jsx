import { Link, useLocation, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function OrderSuccess() {
  const { id } = useParams();
  const { state } = useLocation();
  const order = state?.order;
  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard success-page">
        <section className="success-panel">
          <span className="success-mark">✓</span>
          <span className="eyebrow">Thank you for your order</span>
          <h1>Order placed successfully.</h1>
          <p>Your order has been received and is being prepared.</p>
          <div className="success-order">
            <span>Order number</span>
            <strong>{order?.orderNumber || id}</strong>
            {order?.pricing?.grandTotal && (
              <>
                <span>Amount</span>
                <strong>{money(order.pricing.grandTotal)}</strong>
              </>
            )}
          </div>
          <div className="product-actions">
            <Link className="primary-action" to={`/orders/${id}`}>
              View order
            </Link>
            <Link className="outline-action" to="/dashboard">
              Continue shopping
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
