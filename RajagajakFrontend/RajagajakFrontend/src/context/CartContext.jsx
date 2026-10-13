import { useEffect, useState } from "react";
import { CartContext } from "./cart-context.js";
import { useAuth } from "./useAuth.js";
import {
  DEFAULT_QUANTITY_KG,
  getSelectableMaxStockKg,
  MIN_QUANTITY_KG,
  normalizeQuantityKg,
} from "../utils/quantity.js";

const GUEST_CART_KEY = "rajagajak_cart_guest";

const getCartKey = (user) => {
  const userId = user?._id || user?.id || user?.email;
  return userId ? `rajagajak_cart_${userId}` : GUEST_CART_KEY;
};

const restoreCart = (key) => {
  try {
    const savedCart = JSON.parse(localStorage.getItem(key) || "[]");
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
  quantityKg: normalizeQuantityKg(
    item.quantityKg ?? item.quantity ?? DEFAULT_QUANTITY_KG,
  ),
  stockKg: item.stockKg ?? item.stock ?? null,
});

const mergeCartItems = (primaryItems, guestItems) => {
  const merged = new Map();

  [...primaryItems, ...guestItems].forEach((item) => {
    const normalized = normalizeItem(item);
    const existing = merged.get(normalized.productId);
    if (!existing) {
      merged.set(normalized.productId, normalized);
      return;
    }

    const quantityKg = existing.quantityKg + normalized.quantityKg;
    const stockKg = existing.stockKg ?? normalized.stockKg;
    merged.set(normalized.productId, {
      ...existing,
      quantityKg:
        stockKg !== null && stockKg !== undefined
          ? Math.min(quantityKg, getSelectableMaxStockKg(stockKg))
          : quantityKg,
      stockKg,
    });
  });

  return Array.from(merged.values());
};

export function CartProvider({ children }) {
  const { user } = useAuth();
  const cartKey = getCartKey(user);
  const [cartItems, setCartItems] = useState(() =>
    restoreCart(cartKey).map(normalizeItem),
  );

  const persist = (nextItems) => {
    setCartItems(nextItems);
    localStorage.setItem(cartKey, JSON.stringify(nextItems));
  };

  useEffect(() => {
    const storedItems = restoreCart(cartKey).map(normalizeItem);
    if (!user) {
      setCartItems(storedItems);
      return;
    }

    const guestItems = restoreCart(GUEST_CART_KEY).map(normalizeItem);
    const nextItems = mergeCartItems(storedItems, guestItems);
    setCartItems(nextItems);
    localStorage.setItem(cartKey, JSON.stringify(nextItems));
    localStorage.removeItem(GUEST_CART_KEY);
  }, [cartKey, user]);

  const addToCart = (product, quantityKg = DEFAULT_QUANTITY_KG) => {
    const productId = product._id || product.id;
    const stockKg = Number(product.stock ?? product.stockKg);
    const hasStock = Number.isFinite(stockKg);
    const maxQuantity = hasStock
      ? getSelectableMaxStockKg(stockKg)
      : Infinity;
    if (maxQuantity < MIN_QUANTITY_KG) return;
    const existing = cartItems.find((item) => item.productId === productId);
    const nextQuantity = existing
      ? existing.quantityKg + normalizeQuantityKg(quantityKg)
      : normalizeQuantityKg(quantityKg);
    const normalized = normalizeItem({
      ...(existing || {}),
      productId,
      productName: product.title,
      image: product.images?.[0] || product.image || "",
      pricePerKg: product.finalPrice ?? product.pricePerKg ?? product.price,
      mrpPerKg: product.mrp ?? product.mrpPerKg,
      discountPercentage: product.discount,
      gstPercentage: product.gstPercentage,
      quantityKg: hasStock
        ? Math.min(nextQuantity, maxQuantity)
        : nextQuantity,
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
    const item = cartItems.find((cartItem) => cartItem.itemKey === itemKey);
    const normalizedQuantity = normalizeQuantityKg(quantityKg);
    const nextQuantity =
      item?.stockKg !== null && item?.stockKg !== undefined
        ? Math.min(
            normalizedQuantity,
            getSelectableMaxStockKg(item.stockKg),
          )
        : normalizedQuantity;
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
  const cartCount = cartItems.length;
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
