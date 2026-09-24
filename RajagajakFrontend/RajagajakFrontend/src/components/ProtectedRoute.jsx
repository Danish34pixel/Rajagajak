import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import { useCart } from "../context/useCart.js";
import Loader from "./Loader.jsx";

const PENDING_CHECKOUT_KEY = "rajagajak_pending_checkout";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="page-loader">
        <Loader label="Checking session" />
      </div>
    );
  if (!user) {
    if (location.pathname === "/checkout") {
      localStorage.setItem(PENDING_CHECKOUT_KEY, "true");
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export function CheckoutRoute() {
  const { user, loading } = useAuth();
  const { cartItems } = useCart();
  const location = useLocation();

  if (loading)
    return (
      <div className="page-loader">
        <Loader label="Checking session" />
      </div>
    );

  if (!user && cartItems.length > 0) {
    localStorage.setItem(PENDING_CHECKOUT_KEY, "true");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="page-loader">
        <Loader label="Checking admin access" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (String(user.role).toLowerCase() !== "admin")
    return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
