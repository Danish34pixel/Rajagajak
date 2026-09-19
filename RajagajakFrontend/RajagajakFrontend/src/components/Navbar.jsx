import { LogOut, ShoppingBag, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import { useCart } from "../context/useCart.js";

export default function Navbar({ admin = false }) {
  const { signOut } = useAuth();
  const { cartCount } = useCart();
  return (
    <header className="navbar">
      <a className="brand" href={admin ? "/admin" : "/dashboard"}>
        <img
          className="brand-logo"
          src="/rajagajak-logo.svg"
          alt="Raja Gajak"
        />
      </a>
      <div className="nav-user">
        <Link
          className="bag-link"
          to="/bag"
          aria-label={`Bag, ${cartCount} items`}
        >
          <ShoppingBag size={18} />
          <span>Bag</span>
          {cartCount > 0 && <b>{cartCount}</b>}
        </Link>
        <Link className="profile-link" to="/orders">
          Orders
        </Link>
        <Link className="profile-link" to="/profile">
          <UserRound size={16} />
          Profile
        </Link>
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
