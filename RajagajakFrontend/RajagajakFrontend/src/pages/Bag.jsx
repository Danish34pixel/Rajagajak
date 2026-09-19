import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useCart } from "../context/useCart.js";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function Bag() {
  const { cartItems, cartTotal, updateQuantityKg, removeFromCart } = useCart();
  return (
    <div className="app-shell">
      <Navbar />
      <main className="dashboard bag-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Your selections</span>
            <h1>Your bag.</h1>
            <p>Review your KG quantities before checkout.</p>
          </div>
        </div>
        {cartItems.length === 0 ? (
          <section className="bag-empty">
            <ShoppingBag size={28} />
            <h2>Your bag is empty</h2>
            <p>Add something from the product collection to see it here.</p>
            <Link className="primary-action" to="/dashboard">
              Browse products
            </Link>
          </section>
        ) : (
          <div className="bag-layout">
            <section className="bag-items" aria-label="Bag items">
              {cartItems.map((item) => (
                <article className="bag-item" key={item.itemKey}>
                  <div className="bag-item-image">
                    {item.image ? (
                      <img src={item.image} alt={item.productName} />
                    ) : (
                      <span>No image</span>
                    )}
                  </div>
                  <div className="bag-item-copy">
                    <h2>{item.productName}</h2>
                    <p>
                      {money(item.pricePerKg)}/kg · Quantity: {item.quantityKg}{" "}
                      KG
                    </p>
                    <strong>{money(item.pricePerKg)}/kg</strong>
                    <div className="bag-item-actions">
                      <div className="quantity-control">
                        <button
                          type="button"
                          aria-label={`Decrease ${item.productName}`}
                          onClick={() =>
                            updateQuantityKg(
                              item.itemKey,
                              Math.max(0.1, item.quantityKg - 0.5),
                            )
                          }
                        >
                          <Minus size={15} />
                        </button>
                        <span>{item.quantityKg} KG</span>
                        <button
                          type="button"
                          aria-label={`Increase ${item.productName}`}
                          onClick={() =>
                            updateQuantityKg(
                              item.itemKey,
                              item.quantityKg + 0.5,
                            )
                          }
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                      <button
                        className="remove-button"
                        type="button"
                        onClick={() => removeFromCart(item.itemKey)}
                      >
                        <Trash2 size={15} /> Remove
                      </button>
                    </div>
                  </div>
                  <strong className="bag-item-subtotal">
                    {money(item.pricePerKg * item.quantityKg)}
                  </strong>
                </article>
              ))}
            </section>
            <aside className="bag-summary">
              <span className="eyebrow">Order summary</span>
              <div>
                <span>Subtotal</span>
                <strong>{money(cartTotal)}</strong>
              </div>
              <p>GST and stock are refreshed during checkout.</p>
              <Link className="primary-action" to="/checkout">
                Checkout
              </Link>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
