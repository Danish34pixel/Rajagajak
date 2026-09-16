import { Mail, Phone, MapPin, Hash, Shield, UserRound } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/useAuth.js";

export default function Dashboard() {
  const { user } = useAuth();
  const details = [
    ["Email address", user.email, Mail],
    ["Mobile number", user.mobile, Phone],
    ["Address", user.address, MapPin],
    ["PIN code", user.pinCode, Hash],
  ];
  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Your account</span>
            <h1>Good to see you, {user.name.split(" ")[0]}.</h1>
            <p>Here is the information connected to your Rajagajak profile.</p>
          </div>
          <div className="avatar">
            <UserRound size={23} />
          </div>
        </div>
        <section className="profile-band">
          <div className="profile-label">
            <span className="profile-icon">
              <Shield size={20} />
            </span>
            <div>
              <span className="eyebrow">Current role</span>
              <strong>{user.role}</strong>
            </div>
          </div>
          <span className="status-dot">Active account</span>
        </section>
        <section className="details-grid">
          {details.map(([label, value, Icon]) => (
            <article className="detail-item" key={label}>
              <Icon size={18} />
              <div>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
