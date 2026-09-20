import { LogOut, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/useAuth.js";
import { useCart } from "../context/useCart.js";
import * as api from "../services/api.js";

export default function Navbar({ admin = false }) {
  const { signOut } = useAuth();
  const { cartCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchText(params.get("q") || "");
  }, [location.search]);

  useEffect(() => {
    api
      .products()
      .then((response) => setSuggestions(response.data || []))
      .catch(() => setSuggestions([]));
  }, []);

  const getProductMatch = (value) => {
    const query = value.trim().toLowerCase();
    if (!query) return null;

    const matches = suggestions
      .filter((item) => {
        const haystack = [
          item.title,
          item.category,
          item.description,
          ...(item.bulletPoints || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query) || item.title?.toLowerCase() === query;
      })
      .sort((a, b) => {
        const aTitle = String(a.title || "").toLowerCase();
        const bTitle = String(b.title || "").toLowerCase();
        const aExact = aTitle === query ? 1 : 0;
        const bExact = bTitle === query ? 1 : 0;
        return bExact - aExact;
      });

    return matches[0] || null;
  };

  const filteredSuggestions = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return [];

    return suggestions
      .filter((item) => {
        const haystack = [
          item.title,
          item.category,
          item.description,
          ...(item.bulletPoints || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 5);
  }, [searchText, suggestions]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = searchText.trim();
    const nextPath = "/dashboard";
    if (!trimmed) {
      navigate(nextPath);
      return;
    }

    const productMatch = getProductMatch(trimmed);
    if (productMatch) {
      navigate(`/products/${productMatch._id}`);
      return;
    }

    navigate(`${nextPath}?q=${encodeURIComponent(trimmed)}`);
  };

  const applySuggestion = (value) => {
    setSearchText(value);
    setShowSuggestions(false);
    setMobileSearchOpen(false);

    const productMatch = getProductMatch(value);
    if (productMatch) {
      navigate(`/products/${productMatch._id}`);
      return;
    }

    navigate(`/dashboard?q=${encodeURIComponent(value)}`);
  };

  const toggleMobileSearch = () => {
    setMobileSearchOpen((current) => !current);
  };

  return (
    <header className="navbar">
      <div className="navbar-main">
        <Link className="brand" to={admin ? "/admin" : "/dashboard"}>
          <img
            className="brand-logo"
            src="/rajagajak-logo.svg"
            alt="Raja Gajak"
          />
        </Link>

        <div
          className={`navbar-search-wrap ${mobileSearchOpen ? "mobile-open" : ""}`}
        >
          <form className="navbar-search" onSubmit={handleSubmit}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => setShowSuggestions(false), 120);
              }}
              placeholder="Search products"
              aria-label="Search products"
            />
            {searchText && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearchText("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </form>

          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              className="search-suggestions"
              role="listbox"
              aria-label="Search suggestions"
            >
              {filteredSuggestions.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className="search-suggestion"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applySuggestion(item.title)}
                >
                  <Search size={13} aria-hidden="true" />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="mobile-search-trigger"
          onClick={toggleMobileSearch}
          aria-label="Open search"
        >
          <Search size={18} />
        </button>

        <div className="nav-user">
          <Link
            className="profile-link"
            to="/profile"
            aria-label="View profile"
          >
            <UserRound size={16} />
            Profile
          </Link>
          <Link
            className="bag-link"
            to="/bag"
            aria-label={`Bag, ${cartCount} items`}
          >
            <ShoppingBag size={18} />
            <span>Cart</span>
            {cartCount > 0 && <b>{cartCount}</b>}
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
      </div>
    </header>
  );
}
