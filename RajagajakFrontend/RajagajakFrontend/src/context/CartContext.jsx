import { useState } from "react";
import { CartContext } from "./cart-context.js";

const CART_KEY = "rajagajak_cart";

const restoreCart = () => {
  try {
    const savedCart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(savedCart) ? savedCart : [];
  } catch {
    return [];
  }
};

const normalizeItem = (item) => ({
  itemKey: item.itemKey || item.productId,
  productId: item.productId || item._id,
  productName: item.productName || item.title || "Product",
  image: item.image || "",
  pricePerKg: Number(item.pricePerKg ?? item.price ?? 0),
  mrpPerKg: Number(
    item.mrpPerKg ?? item.mrp ?? item.pricePerKg ?? item.price ?? 0,
  ),
  discountPercentage: Number(item.discountPercentage ?? item.discount ?? 0),
  gstPercentage: Number(item.gstPercentage ?? 0),
  quantityKg: Number(item.quantityKg ?? item.quantity ?? 1),
  stockKg: item.stockKg ?? item.stock ?? null,
});

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() =>
    restoreCart().map(normalizeItem),
  );

  const persist = (nextItems) => {
    setCartItems(nextItems);
    localStorage.setItem(CART_KEY, JSON.stringify(nextItems));
  };

  const addToCart = (product, quantityKg = 1) => {
    const productId = product._id || product.id;
    const stockKg = Number(product.stock ?? product.stockKg);
    const hasStock = Number.isFinite(stockKg);
    const existing = cartItems.find((item) => item.productId === productId);
    const nextQuantity = existing
      ? existing.quantityKg + quantityKg
      : quantityKg;
    const normalized = normalizeItem({
      ...(existing || {}),
      productId,
      productName: product.title,
      image: product.images?.[0] || product.image || "",
      pricePerKg: product.finalPrice ?? product.pricePerKg ?? product.price,
      mrpPerKg: product.mrp ?? product.mrpPerKg,
      discountPercentage: product.discount,
      gstPercentage: product.gstPercentage,
      quantityKg: hasStock ? Math.min(nextQuantity, stockKg) : nextQuantity,
      stockKg: hasStock ? stockKg : null,
    });
    persist(
      existing
        ? cartItems.map((item) =>
            item.productId === productId ? normalized : item,
          )
        : [...cartItems, normalized],
    );
  };

  const updateQuantityKg = (itemKey, quantityKg) => {
    if (quantityKg <= 0) return removeFromCart(itemKey);
    const item = cartItems.find((cartItem) => cartItem.itemKey === itemKey);
    const nextQuantity =
      item?.stockKg !== null && item?.stockKg !== undefined
        ? Math.min(quantityKg, Number(item.stockKg))
        : quantityKg;
    persist(
      cartItems.map((cartItem) =>
        cartItem.itemKey === itemKey
          ? { ...cartItem, quantityKg: nextQuantity }
          : cartItem,
      ),
    );
  };

  const removeFromCart = (itemKey) =>
    persist(cartItems.filter((item) => item.itemKey !== itemKey));
  const clearCart = () => persist([]);
  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantityKg,
    0,
  );
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.pricePerKg * item.quantityKg,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartTotal,
        addToCart,
        updateQuantityKg,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
