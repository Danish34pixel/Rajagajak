import { useState } from "react";
import { Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import Loader from "../components/Loader.jsx";

const initialForm = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  pinCode: "",
  password: "",
  confirmPassword: "",
};

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const update = (field) => (event) =>
    setForm({ ...form, [field]: event.target.value });
  const validate = () => {
    if (!form.name.trim()) return "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Enter a valid email address.";
    if (!/^[6-9]\d{9}$/.test(form.mobile))
      return "Enter a valid 10-digit mobile number.";
    if (!form.address.trim()) return "Please enter your address.";
    if (!/^\d{6}$/.test(form.pinCode)) return "PIN code must contain 6 digits.";
    if (!form.password) return "Please create a password.";
    if (form.password !== form.confirmPassword)
      return "Passwords do not match.";
    return "";
  };
  const submit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    setError(validationError);
    if (validationError) return;
    setSubmitting(true);
    try {
      await signUp({
        name: form.name,
        mobile: form.mobile,
        email: form.email,
        address: form.address,
        pinCode: form.pinCode,
        password: form.password,
      });
      navigate("/login", {
        replace: true,
        state: { message: "Account created. You can sign in now." },
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main className="auth-page signup-page">
      <section className="auth-intro">
        <div className="brand brand-light">
          <span className="brand-mark">
            <ShieldCheck size={18} />
          </span>
          Rajagajak
        </div>
        <div className="intro-copy">
          <span className="eyebrow">Join the community</span>
          <h1>Make room for what matters.</h1>
          <p>Create your member profile and keep your details close at hand.</p>
        </div>
        <span className="intro-footer">Your account stays yours.</span>
      </section>
      <section className="auth-panel">
        <div className="auth-card signup-card">
          <div className="mobile-brand">Rajagajak</div>
          <span className="eyebrow">Create account</span>
          <h2>Start with the basics</h2>
          <p className="section-subtitle">
            All fields are required for a complete profile.
          </p>
          <form className="auth-form signup-form" onSubmit={submit} noValidate>
            {error && (
              <div className="alert" role="alert">
                {error}
              </div>
            )}
            <div className="form-grid">
              <label>
                Full name
                <input
                  value={form.name}
                  onChange={update("name")}
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </label>
              <label>
                Mobile number
                <input
                  value={form.mobile}
                  onChange={update("mobile")}
                  placeholder="10-digit number"
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </label>
              <label>
                Email address
                <input
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
              <label>
                PIN code
                <input
                  value={form.pinCode}
                  onChange={update("pinCode")}
                  placeholder="6-digit PIN"
                  inputMode="numeric"
                />
              </label>
            </div>
            <label>
              Address
              <textarea
                value={form.address}
                onChange={update("address")}
                placeholder="Where can we reach you?"
                rows="3"
              />
            </label>
            <div className="form-grid">
              <PasswordField
                label="Password"
                value={form.password}
                onChange={update("password")}
                show={showPassword}
                toggle={() => setShowPassword(!showPassword)}
              />
              <PasswordField
                label="Confirm password"
                value={form.confirmPassword}
                onChange={update("confirmPassword")}
                show={showPassword}
                toggle={() => setShowPassword(!showPassword)}
              />
            </div>
            <button
              className="primary-button"
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <Loader label="Creating account" />
              ) : (
                <>
                  Create account <ArrowRight size={18} />
                </>
              )}
            </button>
            <p className="form-foot">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

function PasswordField({ label, value, onChange, show, toggle }) {
  return (
    <label>
      {label}
      <div className="input-wrap">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete="new-password"
        />
        <button
          className="field-action"
          type="button"
          onClick={toggle}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}
