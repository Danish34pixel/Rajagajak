import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import Loader from "../components/Loader.jsx";
import { resetPassword } from "../services/api.js";
import "../auth-liquid.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError("Password must be no more than 72 bytes.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password, confirmPassword);
      setComplete(true);
      navigate("/reset-password", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Account security"
      title="Choose a new password"
      subtitle="Create a new password to secure your Raja Gajak account."
    >
      {complete ? (
        <div className="auth-form" role="status">
          <div className="alert alert--enter">
            Your password has been updated successfully. You can now sign in
            with your new password.
          </div>
          <Link className="primary-button primary-button--liquid" to="/login">
            <span className="primary-button__fill" aria-hidden="true" />
            <span className="primary-button__content">
              Continue to sign in <ArrowRight size={18} />
            </span>
          </Link>
        </div>
      ) : !token ? (
        <div className="auth-form" role="alert">
          <div className="alert alert--enter">
            This reset link is missing, invalid, or has expired. Request a new
            link to continue.
          </div>
          <Link className="primary-button primary-button--liquid" to="/forgot-password">
            <span className="primary-button__fill" aria-hidden="true" />
            <span className="primary-button__content">
              Request a new link <ArrowRight size={18} />
            </span>
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit} noValidate>
          {error && (
            <div className="alert alert--enter" role="alert">
              {error}
              {error.toLowerCase().includes("expired") ||
              error.toLowerCase().includes("invalid") ? (
                <>
                  {" "}
                  <Link to="/forgot-password">Request a new reset link</Link>
                </>
              ) : null}
            </div>
          )}
          <label className="field field--stagger">
            New password
            <div className="input-wrap">
              <LockKeyhole size={18} className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                className="field-action"
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide passwords" : "Show passwords"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <label className="field field--stagger">
            Confirm new password
            <div className="input-wrap">
              <LockKeyhole size={18} className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Enter your new password again"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </label>
          <p className="section-subtitle password-hint">
            Use at least 8 characters. Passwords may contain up to 72 UTF-8
            bytes.
          </p>
          <button
            className="primary-button primary-button--liquid"
            type="submit"
            disabled={submitting}
          >
            <span className="primary-button__fill" aria-hidden="true" />
            <span className="primary-button__content">
              {submitting ? (
                <Loader label="Updating password" />
              ) : (
                <>
                  Reset Password <ArrowRight size={18} />
                </>
              )}
            </span>
          </button>
          <p className="form-foot">
            <Link to="/login">Back to sign in</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
