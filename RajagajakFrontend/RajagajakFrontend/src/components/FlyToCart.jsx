import { AnimatePresence, motion } from "framer-motion";
import { createContext, useContext, useState } from "react";

const FlyToCartContext = createContext(null);

const isVisible = (element) => {
  if (!element) return false;
  const styles = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    styles.display !== "none" &&
    styles.visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0
  );
};

export function FlyToCartProvider({ children }) {
  const [flights, setFlights] = useState([]);

  const triggerFlight = ({ source, imageSrc, alt }) => {
    const target = document.querySelector("[data-cart-target]");
    if (!isVisible(source) || !isVisible(target) || !imageSrc) return;

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const startSize = Math.max(1, Math.min(sourceRect.width, 112));
    const endSize = Math.max(8, Math.min(targetRect.width * 0.42, 18));
    const startX = sourceRect.left + (sourceRect.width - startSize) / 2;
    const startY = sourceRect.top + (sourceRect.height - startSize) / 2;
    const endX = targetRect.left + (targetRect.width - endSize) / 2;
    const endY = targetRect.top + (targetRect.height - endSize) / 2;
    const flightId = `${Date.now()}-${Math.random()}`;
    const lift = Math.min(34, Math.max(18, sourceRect.height * 0.12));
    const arc = Math.min(120, Math.max(42, Math.abs(endX - startX) * 0.12));

    setFlights((current) => [
      ...current,
      {
        id: flightId,
        imageSrc,
        alt: alt || "",
        startX,
        startY,
        endX,
        endY,
        startSize,
        endSize,
        lift,
        arc,
        target,
      },
    ]);
  };

  const finishFlight = (flight) => {
    setFlights((current) => current.filter(({ id }) => id !== flight.id));
    if (flight.target && isVisible(flight.target)) {
      bounceCartTarget(flight.target);
    }
  };

  return (
    <FlyToCartContext.Provider value={{ triggerFlight }}>
      {children}
      <AnimatePresence>
        {flights.map((flight) => (
          <motion.img
            key={flight.id}
            className="fly-to-cart-image"
            src={flight.imageSrc}
            alt={flight.alt}
            initial={{
              left: flight.startX,
              top: flight.startY,
              width: flight.startSize,
              height: flight.startSize,
              opacity: 0,
              scale: 0.82,
              rotate: 0,
            }}
            animate={{
              left: [
                flight.startX,
                flight.startX + (flight.endX - flight.startX) * 0.18,
                flight.startX + (flight.endX - flight.startX) * 0.72,
                flight.endX,
              ],
              top: [
                flight.startY,
                flight.startY - flight.lift,
                flight.startY +
                  (flight.endY - flight.startY) * 0.55 -
                  flight.arc,
                flight.endY,
              ],
              width: [
                flight.startSize,
                flight.startSize * 0.94,
                flight.endSize * 1.35,
                flight.endSize,
              ],
              height: [
                flight.startSize,
                flight.startSize * 0.94,
                flight.endSize * 1.35,
                flight.endSize,
              ],
              opacity: [0, 1, 1, 0],
              scale: [0.82, 1.05, 0.92, 0.55],
              rotate: [0, -7, 12, 20],
            }}
            transition={{
              duration: 0.78,
              times: [0, 0.12, 0.72, 1],
              ease: [0.22, 0.75, 0.28, 1],
            }}
            onAnimationComplete={() => finishFlight(flight)}
          />
        ))}
      </AnimatePresence>
    </FlyToCartContext.Provider>
  );
}

function bounceCartTarget(target) {
  target.classList.remove("cart-target-bounce");
  void target.offsetWidth;
  target.classList.add("cart-target-bounce");
  window.setTimeout(() => target.classList.remove("cart-target-bounce"), 360);
}

export function useFlyToCart() {
  const context = useContext(FlyToCartContext);
  if (!context) {
    throw new Error("useFlyToCart must be used within FlyToCartProvider");
  }
  return context;
}
