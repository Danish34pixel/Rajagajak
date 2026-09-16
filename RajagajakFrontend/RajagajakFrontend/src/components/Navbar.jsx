import { LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/useAuth.js";

export default function Navbar({ admin = false }) {
  const { user, signOut } = useAuth();
  return (
    <header className="navbar">
      <a className="brand" href={admin ? "/admin" : "/dashboard"}>
        <span className="brand-mark">
          <ShieldCheck size={18} />
        </span>
        Rajagajak
      </a>
      <div className="nav-user">
        <span className="nav-name">{user?.name}</span>
        <span className="role-badge">{admin ? "Administrator" : "Member"}</span>
        <button
          className="icon-button"
          type="button"
          onClick={signOut}
          title="Log out"
          aria-label="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
