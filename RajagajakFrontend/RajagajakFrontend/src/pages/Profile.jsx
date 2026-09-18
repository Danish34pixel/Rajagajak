import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Edit3,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Loader from "../components/Loader.jsx";
import { useAuth } from "../context/useAuth.js";
import * as api from "../services/api.js";

const emptyForm = {
  name: "",
  mobile: "",
  email: "",
  address: "",
  pinCode: "",
};

const roleLabel = (role) =>
  String(role).toLowerCase() === "admin" ? "Administrator" : "User";

export default function Profile() {
  const { signOut, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    api
      .profile()
      .then((response) => {
        if (!active) return;
        setProfile(response.data.user);
        setForm({ ...emptyForm, ...response.data.user });
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 401) {
          signOut();
          navigate("/login", { replace: true });
          return;
        }
        setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate, signOut]);

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await api.updateProfile(form);
      const nextProfile = response.data.user;
      setProfile(nextProfile);
      setForm({ ...emptyForm, ...nextProfile });
      updateUser(nextProfile);
      setEditing(false);
      setNotice("Profile updated successfully.");
    } catch (requestError) {
      if (requestError.status === 401) {
        signOut();
        navigate("/login", { replace: true });
        return;
      }
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setForm({ ...emptyForm, ...profile });
    setEditing(false);
    setError("");
  };

  return (
    <div className="app-shell">
      <Navbar admin={profile?.role === "admin"} />
      <main className="profile-page">
        <Link
          className="back-link"
          to={profile?.role === "admin" ? "/admin" : "/dashboard"}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
        {loading && (
          <div className="profile-loader">
            <Loader label="Loading profile" />
          </div>
        )}
        {!loading && error && <div className="alert">{error}</div>}
        {!loading && profile && (
          <>
            <section className="profile-header">
              <div className="profile-avatar">
                <UserRound size={30} />
              </div>
              <div className="profile-header-copy">
                <span className="eyebrow">Your account</span>
                <h1>{profile.name}</h1>
                <p>{roleLabel(profile.role)}</p>
              </div>
              {!editing && (
                <button
                  className="primary-button profile-edit-button"
                  type="button"
                  onClick={() => setEditing(true)}
                >
                  <Edit3 size={16} />
                  Edit Profile
                </button>
              )}
            </section>
            {notice && <div className="success-note">{notice}</div>}
            {editing ? (
              <form className="profile-form" onSubmit={save}>
                <ProfileFields form={form} onChange={updateField} />
                {error && <div className="alert">{error}</div>}
                <div className="profile-actions">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    className="secondary-action profile-cancel"
                    type="button"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-sections">
                <ProfileSection title="Personal information">
                  <ProfileValue
                    icon={UserRound}
                    label="Full name"
                    value={profile.name}
                  />
                  <ProfileValue
                    icon={Mail}
                    label="Email address"
                    value={profile.email}
                  />
                  <ProfileValue
                    icon={Phone}
                    label="Mobile number"
                    value={profile.mobile}
                  />
                </ProfileSection>
                <ProfileSection title="Address">
                  <ProfileValue
                    icon={MapPin}
                    label="Complete address"
                    value={profile.address}
                  />
                  <ProfileValue
                    icon={MapPin}
                    label="Pin code"
                    value={profile.pinCode}
                  />
                </ProfileSection>
                <ProfileSection title="Account information">
                  <ProfileValue
                    icon={ShieldCheck}
                    label="Account role"
                    value={roleLabel(profile.role)}
                  />
                  {profile.createdAt && (
                    <ProfileValue
                      icon={ShieldCheck}
                      label="Joined"
                      value={new Date(profile.createdAt).toLocaleDateString()}
                    />
                  )}
                </ProfileSection>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ProfileSection({ title, children }) {
  return (
    <section className="profile-section">
      <h2>{title}</h2>
      <div className="profile-values">{children}</div>
    </section>
  );
}

function ProfileValue({ icon: Icon, label, value }) {
  return (
    <div className="profile-value">
      <Icon size={18} />
      <div>
        <span>{label}</span>
        <strong>{value || "Not provided"}</strong>
      </div>
    </div>
  );
}

function ProfileFields({ form, onChange }) {
  return (
    <section className="profile-section">
      <h2>Edit profile</h2>
      <div className="profile-fields">
        <label>
          Full name
          <input name="name" value={form.name} onChange={onChange} required />
        </label>
        <label>
          Mobile number
          <input
            name="mobile"
            value={form.mobile}
            onChange={onChange}
            inputMode="numeric"
            required
          />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
          />
        </label>
        <label>
          Pin code
          <input
            name="pinCode"
            value={form.pinCode}
            onChange={onChange}
            inputMode="numeric"
            required
          />
        </label>
        <label className="profile-address-field">
          Complete address
          <textarea
            name="address"
            value={form.address}
            onChange={onChange}
            required
          />
        </label>
      </div>
    </section>
  );
}
