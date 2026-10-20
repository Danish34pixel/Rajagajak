export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <main className="auth-page">
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
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <span className="intro-footer">
          A considered space for every member.
        </span>
      </section>

      <section className="auth-panel">
        <div className="auth-card auth-card--liquid">
          <div className="mobile-brand">
            <img
              className="brand-logo"
              src="/rajagajak-logo.svg"
              alt="Raja Gajak"
            />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
