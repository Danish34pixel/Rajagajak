const API_URL = (
  import.meta.env.VITE_API_URL || "https://rajagajak-2.onrender.com"
)
  .trim()
  .replace(/\/+$/, "");
const API_ROOT = `${API_URL}/api/v1`;

const messages = {
  400: "Please check the information you entered.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to do that.",
  404: "That resource could not be found.",
  500: "The server is having trouble. Please try again shortly.",
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const request = async (path, options = {}, apiRoot = API_ROOT) => {
  const token = localStorage.getItem("rajagajak_token");
  const headers = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${apiRoot}${path}`, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(
        payload.message ||
          messages[response.status] ||
          "Something went wrong. Please try again.",
        response.status,
      );
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error?.message ||
        "Unable to reach the server. Check your connection and try again.",
    );
  }
};

export const signup = (userData) =>
  request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ ...userData, role: "user" }),
  });
export const login = (credentials) =>
  request("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
export const profile = () => request("/auth/profile");
export const updateProfile = (user) =>
  request("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(user),
  });
export const getCurrentUser = () => {
  const user = localStorage.getItem("rajagajak_user");
  return user ? JSON.parse(user) : null;
};
export const logout = () => {};

export const adminProducts = () => request("/admin/products");
export const createProduct = (product) =>
  request("/admin/products", { method: "POST", body: JSON.stringify(product) });
export const updateProduct = (id, product) =>
  request(`/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
export const deleteProduct = (id) =>
  request(`/admin/products/${id}`, { method: "DELETE" });
export const adminCoupons = () => request("/admin/coupons");
export const adminCoupon = (id) => request(`/admin/coupons/${id}`);
export const adminCouponUsers = (query = "") =>
  request(
    `/admin/coupon-users${query ? `?q=${encodeURIComponent(query)}` : ""}`,
  );
export const createCoupon = (coupon) =>
  request("/admin/coupons", { method: "POST", body: JSON.stringify(coupon) });
export const updateCoupon = (id, coupon) =>
  request(`/admin/coupons/${id}`, {
    method: "PUT",
    body: JSON.stringify(coupon),
  });
export const deleteCoupon = (id) =>
  request(`/admin/coupons/${id}`, { method: "DELETE" });
export const uploadAdminImages = (files) => {
  const form = new FormData();
  files.forEach((file) => form.append("images", file));
  return request("/images", { method: "POST", body: form });
};
export const activeCoupons = () => request("/coupons/active");
export const applyCoupon = (code, checkout) =>
  request(
    "/coupons/apply",
    {
      method: "POST",
      body: JSON.stringify({ code, ...checkout }),
    },
    `${API_URL}/api`,
  );
export const products = () => request("/products");
export const product = (id) => request(`/products/${id}`);
export const createOrder = (order) =>
  request("/orders", { method: "POST", body: JSON.stringify(order) });
export const createRazorpayOrder = (order) =>
  request("/payment/create-order", {
    method: "POST",
    body: JSON.stringify(order),
  });
export const paymentConfig = () =>
  request("/payment/config", {}, `${API_URL}/api`);
export const verifyRazorpayPayment = (payload) =>
  request("/payment/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const quoteOrder = (items) =>
  request("/orders/quote", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
export const quoteShipping = (delivery) =>
  request(
    "/delivery/calculate",
    {
      method: "POST",
      body: JSON.stringify(delivery),
    },
    `${API_URL}/api`,
  );
export const myOrders = () => request("/orders/my-orders");
export const myOrder = (id) => request(`/orders/${id}`);
export const cancelOrder = (id, reason) =>
  request(`/orders/${id}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
export const adminOrders = (status = "") =>
  request(
    `/admin/orders${status ? `?status=${encodeURIComponent(status)}` : ""}`,
  );
export const adminOrder = (id) => request(`/admin/orders/${id}`);
export const updateOrderStatus = (id, status) =>
  request(`/admin/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
export const cancelAdminOrder = (id, reason) =>
  request(`/admin/orders/${id}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
export const orderStatusNotifications = () => request("/notifications");
export const markOrderStatusNotificationRead = (id) =>
  request(`/notifications/${id}/read`, { method: "PATCH" });
