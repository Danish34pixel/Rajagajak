const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");
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

const request = async (path, options = {}) => {
  const token = localStorage.getItem("rajagajak_token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
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
export const getCurrentUser = () => {
  const user = localStorage.getItem("rajagajak_user");
  return user ? JSON.parse(user) : null;
};
export const logout = () => {};
