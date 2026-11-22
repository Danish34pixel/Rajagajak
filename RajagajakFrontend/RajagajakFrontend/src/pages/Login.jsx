import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, ArrowRight } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import Loader from "../components/Loader.jsx";
import AuthLayout from "../components/AuthLayout.jsx";
import "../auth-liquid.css";

const isAdmin = (user) => String(user?.role).toLowerCase() === "admin";
const PENDING_CHECKOUT_KEY = "rajagajak_pending_checkout";

const getRoutePath = (route) => {
  if (!route?.pathname) return null;
  return `${route.pathname}${route.search || ""}${route.hash || ""}`;
};

export default function Login() {
  const { user, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState("email");
  const [form, setForm] = useState({
    email: "",
    mobile: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  const getPostLoginPath = () => {
    const pendingRoute = getRoutePath(location.state?.from);
    if (pendingRoute) return pendingRoute;
    if (localStorage.getItem(PENDING_CHECKOUT_KEY) === "true") {
      return "/checkout";
    }
    return null;
  };

  if (user)
    return (
      <Navigate
        to={isAdmin(user) ? "/admin" : getPostLoginPath() || "/dashboard"}
        replace
      />
    );

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 420);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const identifier = loginMethod === "email" ? form.email.trim() : form.mobile;
    if (!identifier || !form.password) {
      setError(
        loginMethod === "email"
          ? "Enter your email and password to continue."
          : "Enter your mobile number and password to continue.",
      );
      triggerShake();
      return;
    }
    if (
      loginMethod === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
    ) {
      setError("Enter a valid email address.");
      triggerShake();
      return;
    }
    if (loginMethod === "mobile" && !/^[6-9]\d{9}$/.test(identifier)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      triggerShake();
      return;
    }
    setSubmitting(true);
    try {
      const loggedInUser = await signIn({
        [loginMethod]: identifier,
        password: form.password,
      });
      const adminUser = isAdmin(loggedInUser);
      const pendingPath = adminUser ? null : getPostLoginPath();
      if (adminUser || pendingPath) {
        localStorage.removeItem(PENDING_CHECKOUT_KEY);
      }
      navigate(adminUser ? "/admin" : pendingPath || "/dashboard", {
        replace: true,
      });
    } catch (requestError) {
      setError(requestError.message);
      triggerShake();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Member access"
      title="Welcome back"
      subtitle="Sign in to continue to your Raja Gajak account."
    >
      <form
        className={`auth-form${shake ? " auth-form--shake" : ""}`}
        onSubmit={submit}
        noValidate
      >
        {error && (
          <div className="alert alert--enter" role="alert">
            {error}
          </div>
        )}

        <div
          className="auth-method-selector field--stagger"
          role="group"
          aria-label="Login method"
        >
          <button
            type="button"
            className={loginMethod === "email" ? "is-selected" : ""}
            aria-pressed={loginMethod === "email"}
            onClick={() => setLoginMethod("email")}
          >
            Email
          </button>
          <button
            type="button"
            className={loginMethod === "mobile" ? "is-selected" : ""}
            aria-pressed={loginMethod === "mobile"}
            onClick={() => setLoginMethod("mobile")}
          >
            Mobile Number
          </button>
        </div>

        {loginMethod === "email" ? (
          <label className="field field--stagger" style={{ "--delay": "0ms" }}>
            Email address
            <div className="input-wrap">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </label>
        ) : (
          <label className="field field--stagger" style={{ "--delay": "0ms" }}>
            Mobile number
            <div className="input-wrap auth-mobile-input-wrap">
              <span className="auth-country-code" aria-hidden="true">
                +91
              </span>
              <input
                type="tel"
                value={form.mobile}
                onChange={(e) =>
                  setForm({
                    ...form,
                    mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                placeholder="10-digit mobile number"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                required
              />
            </div>
          </label>
        )}

        <div className="field field--stagger" style={{ "--delay": "70ms" }}>
          <div className="field-heading">
            <label htmlFor="login-password">Password</label>
            <Link className="forgot-password-link" to="/forgot-password">
              Forgot Password?
            </Link>
          </div>
          <div className="input-wrap">
            <LockKeyhole size={18} className="input-icon" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
            <button
              className="field-action"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          className="primary-button primary-button--liquid"
          type="submit"
          disabled={submitting}
          style={{ "--delay": "140ms" }}
        >
          <span className="primary-button__fill" aria-hidden="true" />
          <span className="primary-button__content">
            {submitting ? (
              <Loader label="Signing in" />
            ) : (
              <>
                Sign in <ArrowRight size={18} />
              </>
            )}
          </span>
        </button>

        <p className="form-foot field--stagger" style={{ "--delay": "200ms" }}>
          New to Raja Gajak?{" "}
          <Link to="/signup" state={location.state}>
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
