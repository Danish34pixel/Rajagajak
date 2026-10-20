import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
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
import About from "./pages/About.jsx";
import TermsAndConditions from "./pages/TermsAndConditions.jsx";
import Blog from "./pages/Blog.jsx";
import BlogArticle from "./pages/BlogArticle.jsx";
import ProtectedRoute, {
  AdminRoute,
  CheckoutRoute,
} from "./components/ProtectedRoute.jsx";
import OrderStatusNotification from "./components/OrderStatusNotification.jsx";
import WhatsAppChatButton from "./components/WhatsAppChatButton.jsx";
import { FlyToCartProvider } from "./components/FlyToCart.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <FlyToCartProvider>
        <ScrollToTop />
        <OrderStatusNotification />
        <WhatsAppChatButton />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/terms-and-conditions"
            element={<TermsAndConditions />}
          />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogArticle />} />
          <Route path="/products/:id" element={<ProductDetails />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </FlyToCartProvider>
    </BrowserRouter>
  );
}

export default App;
