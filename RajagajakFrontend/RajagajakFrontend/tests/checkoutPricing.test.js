import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateCheckoutGrandTotal,
  getCartTotalWeightKg,
  isMinimumCartWeightMet,
} from "../src/utils/checkoutPricing.js";

test("grand total includes GST and calculated shipping", () => {
  assert.equal(
    calculateCheckoutGrandTotal({
      taxableAmount: 510,
      gstAmount: 61.2,
      shippingCharge: 30,
    }),
    601.2,
  );
});

test("grand total remains correct while shipping is unavailable", () => {
  assert.equal(
    calculateCheckoutGrandTotal({ taxableAmount: 510, gstAmount: 61.2 }),
    571.2,
  );
});

test("coupon discount is applied without changing GST or shipping", () => {
  assert.equal(
    calculateCheckoutGrandTotal({
      taxableAmount: 510,
      couponDiscount: 50,
      gstAmount: 61.2,
      shippingCharge: 30,
    }),
    551.2,
  );
});

test("combined cart weight accepts separate products totaling 1 kg", () => {
  const cartItems = [{ quantityKg: 0.3 }, { quantityKg: 0.7 }];

  assert.equal(getCartTotalWeightKg(cartItems), 1);
  assert.equal(isMinimumCartWeightMet(cartItems), true);
});

test("combined cart weight blocks checkout below 1 kg", () => {
  const cartItems = [{ quantityKg: 0.3 }, { quantityKg: 0.5 }];

  assert.equal(getCartTotalWeightKg(cartItems), 0.8);
  assert.equal(isMinimumCartWeightMet(cartItems), false);
});
