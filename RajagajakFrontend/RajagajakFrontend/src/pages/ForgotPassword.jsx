import { useState } from "react";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import Loader from "../components/Loader.jsx";
import { requestPasswordReset } from "../services/api.js";
import "../auth-liquid.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Forgot your password?"
      subtitle="We’ll help you get back to your Raja Gajak account."
    >
      {submitted ? (
        <div className="auth-form" role="status">
          <div className="alert alert--enter">
            If an account exists for that email, reset instructions may be
            sent. If no message arrives, you can safely request another link.
          </div>
          <p className="form-foot">
            Didn’t receive an email? Check your address or try again in a few
            minutes.
          </p>
          <Link className="primary-button primary-button--liquid" to="/login">
            <span className="primary-button__fill" aria-hidden="true" />
            <span className="primary-button__content">
              <ArrowLeft size={18} /> Back to sign in
            </span>
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit} noValidate>
          {error && (
            <div className="alert alert--enter" role="alert">
              {error}
            </div>
          )}
          <p className="section-subtitle auth-copy">
            Enter the email address associated with your account and we’ll send
            you a secure reset link.
          </p>
          <label className="field field--stagger">
            Email address
            <div className="input-wrap">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </label>
          <button
            className="primary-button primary-button--liquid"
            type="submit"
            disabled={submitting}
          >
            <span className="primary-button__fill" aria-hidden="true" />
            <span className="primary-button__content">
              {submitting ? (
                <Loader label="Sending request" />
              ) : (
                <>
                  Send reset link <ArrowRight size={18} />
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
