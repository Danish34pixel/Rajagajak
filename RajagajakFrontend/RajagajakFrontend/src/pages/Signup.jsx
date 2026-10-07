import { useEffect, useState } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import Loader from "../components/Loader.jsx";
import "../auth-liquid.css";

const initialForm = {
  name: "",
  mobile: "",
  email: "",
  address: {
    addressLine1: "",
    addressLine2: "",
    pincode: "",
    city: "",
    state: "",
    country: "India",
  },
  pinCode: "",
  password: "",
  confirmPassword: "",
};

export default function Signup() {
  const { signUp, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState("idle");
  const [pincodeMessage, setPincodeMessage] = useState("");
  const update = (field) => (event) =>
    setForm({ ...form, [field]: event.target.value });
  const updateAddress = (field) => (event) =>
    setForm((current) => ({
      ...current,
      address: { ...current.address, [field]: event.target.value },
    }));
  const updatePincode = (event) => {
    const pinCode = event.target.value.replace(/\D/g, "").slice(0, 6);
    setForm((current) => ({
      ...current,
      pinCode,
      address: {
        ...current.address,
        pincode: pinCode,
        city: "",
        state: "",
      },
    }));
    setPincodeStatus("idle");
    setPincodeMessage("");
  };

  useEffect(() => {
    if (!/^\d{6}$/.test(form.pinCode)) return undefined;

    let active = true;
    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 10000);
    const timeout = setTimeout(async () => {
      setPincodeStatus("loading");
      try {
        const response = await fetch(
          `https://api.postalpincode.in/pincode/${form.pinCode}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("PIN lookup unavailable");

        const [result] = await response.json();
        if (result?.Status === "Error") {
          if (!active) return;
          setPincodeStatus("invalid");
          setPincodeMessage(
            "Invalid pincode. Please check and enter a valid 6-digit pincode.",
          );
          return;
        }

        const postOffice = result?.PostOffice?.[0];
        if (!postOffice?.District || !postOffice?.State) {
          throw new Error("PIN lookup returned incomplete location data");
        }
        if (!active) return;

        setForm((current) => ({
          ...current,
          address: {
            ...current.address,
            city: postOffice.District,
            state: postOffice.State,
            country: postOffice.Country || "India",
          },
        }));
        setPincodeStatus("success");
        setPincodeMessage("");
      } catch {
        if (!active) return;
        setPincodeStatus("error");
        setPincodeMessage(
          "Couldn't detect location automatically. Please enter your city and state manually.",
        );
      } finally {
        clearTimeout(requestTimeout);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeout);
      clearTimeout(requestTimeout);
      controller.abort();
    };
  }, [form.pinCode]);

  const validate = () => {
    if (!form.name.trim()) return "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Enter a valid email address.";
    if (!/^[6-9]\d{9}$/.test(form.mobile))
      return "Enter a valid 10-digit mobile number.";
    if (!/^\d{6}$/.test(form.pinCode)) return "PIN code must contain 6 digits.";
    if (pincodeStatus === "loading")
      return "Please wait while we detect your city and state.";
    if (pincodeStatus === "invalid")
      return "Invalid pincode. Please check and enter a valid 6-digit pincode.";
    if (!form.address.addressLine1.trim())
      return "Please enter your address line 1.";
    if (!form.address.city.trim() || !form.address.state.trim())
      return "Please enter your city and state.";
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
      if (location.state?.from?.pathname !== "/checkout") {
        navigate("/login", {
          replace: true,
          state: { message: "Account created. You can sign in now." },
        });
        return;
      }
      try {
        await signIn({ email: form.email, password: form.password });
        navigate("/checkout", { replace: true });
      } catch {
        navigate("/login", {
          replace: true,
          state: {
            ...location.state,
            message: "Account created. Please sign in to continue.",
          },
        });
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main className="auth-page signup-page">
      <div className="liquid-blobs" aria-hidden="true">
        <span className="blob blob--one" />
        <span className="blob blob--two" />
        <span className="blob blob--three" />
      </div>
      <section className="auth-intro">
        <div className="brand brand-light">
          <img
            className="brand-logo"
            src="/rajagajak-logo.svg"
            alt="Raja Gajak"
          />
        </div>
        <div className="intro-copy">
          <span className="eyebrow">Join the community</span>
          <h1>Make room for what matters.</h1>
          <p>Create your member profile and keep your details close at hand.</p>
        </div>
        <span className="intro-footer">Your account stays yours.</span>
      </section>
      <section className="auth-panel">
        <div className="auth-card signup-card auth-card--liquid">
          <div className="mobile-brand">
            <img
              className="brand-logo"
              src="/rajagajak-logo.svg"
              alt="Raja Gajak"
            />
          </div>
          <span className="eyebrow">Create account</span>
          <h2>Bring home the joy of every bite</h2>
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
              <label
                className="field field--stagger"
                style={{ "--delay": "0ms" }}
              >
                Full name
                <input
                  value={form.name}
                  onChange={update("name")}
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </label>
              <label
                className="field field--stagger"
                style={{ "--delay": "50ms" }}
              >
                Mobile number
                <input
                  value={form.mobile}
                  onChange={update("mobile")}
                  placeholder="10-digit number"
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </label>
              <label
                className="field field--stagger"
                style={{ "--delay": "100ms" }}
              >
                Email address
                <input
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>
            </div>
            <label
              className="field field--stagger"
              style={{ "--delay": "150ms" }}
            >
              Address Line 1
              <input
                value={form.address.addressLine1}
                onChange={updateAddress("addressLine1")}
                placeholder="House / Flat / Shop No., Building and Street"
                autoComplete="address-line1"
                required
              />
            </label>
            <label
              className="field field--stagger"
              style={{ "--delay": "200ms" }}
            >
              Address Line 2 (optional)
              <input
                value={form.address.addressLine2}
                onChange={updateAddress("addressLine2")}
                placeholder="Area, Locality or Landmark"
                autoComplete="address-line2"
              />
            </label>
            <div className="form-grid">
              <label className="field field--stagger">
                Pincode
                <input
                  value={form.pinCode}
                  onChange={updatePincode}
                  placeholder="6-digit PIN"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                  required
                />
              </label>
              <label className="field field--stagger">
                City
                <input
                  value={form.address.city}
                  onChange={updateAddress("city")}
                  placeholder={
                    pincodeStatus === "loading"
                      ? "Detecting..."
                      : "Detected from pincode"
                  }
                  readOnly={pincodeStatus !== "error"}
                  required
                />
              </label>
              <label className="field field--stagger">
                State
                <input
                  value={form.address.state}
                  onChange={updateAddress("state")}
                  placeholder={
                    pincodeStatus === "loading"
                      ? "Detecting..."
                      : "Detected from pincode"
                  }
                  readOnly={pincodeStatus !== "error"}
                  required
                />
              </label>
              <label className="field field--stagger">
                Country
                <input
                  value={form.address.country}
                  onChange={updateAddress("country")}
                  autoComplete="country-name"
                  required
                />
              </label>
            </div>
            {(pincodeStatus === "loading" || pincodeMessage) && (
              <p
                className="section-subtitle"
                role={pincodeStatus === "invalid" ? "alert" : "status"}
                aria-live="polite"
              >
                {pincodeStatus === "loading"
                  ? "Detecting location..."
                  : pincodeMessage}
              </p>
            )}
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
              className="primary-button primary-button--liquid"
              type="submit"
              disabled={submitting}
              style={{ "--delay": "300ms" }}
            >
              <span className="primary-button__fill" aria-hidden="true" />
              <span className="primary-button__content">
                {submitting ? (
                  <Loader label="Creating account" />
                ) : (
                  <>
                    Create account <ArrowRight size={18} />
                  </>
                )}
              </span>
            </button>
            <p
              className="form-foot field--stagger"
              style={{ "--delay": "360ms" }}
            >
              Already have an account?{" "}
              <Link to="/login" state={location.state}>
                Sign in
              </Link>
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
