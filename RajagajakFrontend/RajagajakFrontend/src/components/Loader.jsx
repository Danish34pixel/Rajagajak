export default function Loader({ label = "Loading" }) {
  return <span className="loader" aria-label={label} role="status" />;
}
