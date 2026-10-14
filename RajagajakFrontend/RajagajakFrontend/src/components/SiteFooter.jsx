import {
  ArrowUpRight,
  BookOpen,
  Info,
  ScrollText,
  ShoppingBag,
} from "lucide-react";
import { Link } from "react-router-dom";
import "./SiteFooter.css";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-main">
          <div className="site-footer-brand-block">
            <Link className="site-footer-brand" to="/dashboard">
              RAJA GAJAK<sup>®</sup>
            </Link>
            <p>Pure taste and tradition since 2006.</p>
            <span className="site-footer-badge">
              <span aria-hidden="true" />
              A little tradition in every bite
            </span>
          </div>
          <nav className="site-footer-nav" aria-label="Footer navigation">
            <h2>Explore</h2>
            <div className="site-footer-links">
              <Link to="/blog">
                <BookOpen size={17} aria-hidden="true" />
                Blog
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
              <Link to="/about">
                <Info size={17} aria-hidden="true" />
                About Us
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
              <Link to="/terms-and-conditions">
                <ScrollText size={17} aria-hidden="true" />
                Terms &amp; Conditions
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
              <Link to="/#products-section">
                <ShoppingBag size={17} aria-hidden="true" />
                Shop sweets
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </nav>
        </div>
        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} RAJA GAJAK<sup>®</sup></span>
          <span>Made with love for tradition</span>
        </div>
      </div>
    </footer>
  );
}
