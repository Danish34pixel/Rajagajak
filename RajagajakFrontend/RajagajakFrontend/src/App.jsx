import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";
import Bag from "./pages/Bag.jsx";
import Checkout from "./pages/Checkout.jsx";
import MyOrders from "./pages/MyOrders.jsx";
import OrderDetails from "./pages/OrderDetails.jsx";
import OrderSuccess from "./pages/OrderSuccess.jsx";
import AdminOrderDetails from "./pages/AdminOrderDetails.jsx";
import Profile from "./pages/Profile.jsx";
import ProtectedRoute, {
  AdminRoute,
  CheckoutRoute,
} from "./components/ProtectedRoute.jsx";
import { FlyToCartProvider } from "./components/FlyToCart.jsx";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <FlyToCartProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bag" element={<Bag />} />
          <Route element={<CheckoutRoute />}>
            <Route path="/checkout" element={<Checkout />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/orders" element={<MyOrders />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/order-success/:id" element={<OrderSuccess />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/admin/*" element={<AdminDashboard />} />
            <Route path="/admin/orders/:id" element={<AdminOrderDetails />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </FlyToCartProvider>
    </BrowserRouter>
  );
}

export default App;
