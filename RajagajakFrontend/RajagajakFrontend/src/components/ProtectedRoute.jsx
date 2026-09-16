import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import Loader from "./Loader.jsx";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="page-loader">
        <Loader label="Checking session" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (location.pathname === "/admin" && user.role !== "admin")
    return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
