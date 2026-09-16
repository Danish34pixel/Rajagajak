import {
  BarChart3,
  Users,
  Activity,
  Database,
  ShieldCheck,
} from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/useAuth.js";

export default function AdminDashboard() {
  const { user } = useAuth();
  const stats = [
    ["Total users", "—", Users],
    ["Active today", "—", Activity],
    ["Stored images", "—", Database],
  ];
  return (
    <div className="app-shell">
      <Navbar admin />
      <main className="dashboard">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Operations overview</span>
            <h1>Admin dashboard</h1>
            <p>Keep an eye on the Rajagajak experience from one place.</p>
          </div>
          <div className="admin-seal">
            <ShieldCheck size={26} />
          </div>
        </div>
        <section className="admin-welcome">
          <BarChart3 size={24} />
          <div>
            <strong>Welcome, {user.name}</strong>
            <span>Signed in as {user.email}</span>
          </div>
        </section>
        <section className="stat-grid">
          {stats.map(([label, value, Icon]) => (
            <article className="stat-card" key={label}>
              <Icon size={20} />
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>
        <section className="users-placeholder">
          <div>
            <span className="eyebrow">Directory</span>
            <h2>Users</h2>
            <p>
              User management will appear here as the administration API grows.
            </p>
          </div>
          <span className="placeholder-tag">Ready for data</span>
        </section>
      </main>
    </div>
  );
}
