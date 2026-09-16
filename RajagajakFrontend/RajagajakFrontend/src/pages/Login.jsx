import { useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import Loader from "../components/Loader.jsx";

export default function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user)
    return (
      <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />
    );

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("Enter your email and password to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const loggedInUser = await signIn(form);
      navigate(loggedInUser.role === "admin" ? "/admin" : "/dashboard", {
        replace: true,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Member access"
      title="Welcome back"
      subtitle="Sign in to continue to your Rajagajak account."
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        <label>
          Email address
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <div className="input-wrap">
            <LockKeyhole size={18} />
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter your password"
              autoComplete="current-password"
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
        </label>
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? (
            <Loader label="Signing in" />
          ) : (
            <>
              Sign in <ArrowRight size={18} />
            </>
          )}
        </button>
        <p className="form-foot">
          New to Rajagajak? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="brand brand-light">
          <span className="brand-mark">
            <ShieldCheck size={18} />
          </span>
          Rajagajak
        </div>
        <div className="intro-copy">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <span className="intro-footer">
          A considered space for every member.
        </span>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="mobile-brand">Rajagajak</div>
          {children}
        </div>
      </section>
    </main>
  );
}
