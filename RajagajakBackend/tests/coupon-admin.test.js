process.env.MONGO_URI ||= "mongodb://localhost/rajagajak-test";
process.env.JWT_SECRET ||= "test-jwt-secret";
process.env.IMAGEKIT_PRIVATE_KEY ||= "private_test_key";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeCoupon } = require("../src/controllers/coupon.controller");

const validCoupon = (overrides = {}) => ({
  code: " save-20 ",
  title: "Save twenty",
  type: "percentage",
  discountType: "percentage",
  discountValue: 20,
  minimumOrderValue: 500,
  maximumDiscount: 100,
  startDate: "2026-09-01T00:00",
  expiryDate: "2026-12-31T23:59",
  isActive: true,
  ...overrides,
});

test("coupon codes normalize case and whitespace and percentage values validate", () => {
  const coupon = normalizeCoupon(validCoupon());
  assert.equal(coupon.code, "SAVE-20");
  assert.equal(coupon.type, "percentage");
  assert.equal(coupon.discountValue, 20);
  assert.equal(coupon.maximumDiscount, 100);
  assert.equal(normalizeCoupon(validCoupon({ discountValue: 101 })), null);
});

test("all shipping and buy-get types accept valid rule fields", () => {
  for (const type of ["free_shipping", "fixed_shipping"]) {
    const coupon = normalizeCoupon(
      validCoupon({ type, discountValue: type === "free_shipping" ? 0 : 20 }),
    );
    assert.ok(coupon, `${type} should normalize`);
  }
  for (const type of [
    "buy_x_get_y",
    "buy_x_get_percentage",
    "buy_x_get_fixed",
  ]) {
    const coupon = normalizeCoupon(
      validCoupon({
        type,
        discountValue: 0,
        buyQuantity: 2,
        getQuantity: 1,
        getDiscountPercentage: type === "buy_x_get_percentage" ? 20 : null,
        getDiscountAmount: type === "buy_x_get_fixed" ? 100 : null,
      }),
    );
    assert.ok(coupon, `${type} should normalize`);
  }
});

test("invalid schedule, limits, target IDs, pincode, and payment values are rejected", () => {
  assert.equal(
    normalizeCoupon(validCoupon({ expiryDate: "2026-08-01T00:00" })),
    null,
  );
  assert.equal(normalizeCoupon(validCoupon({ usageLimit: 1.5 })), null);
  assert.equal(
    normalizeCoupon(validCoupon({ applicableProducts: ["bad-id"] })),
    null,
  );
  assert.equal(
    normalizeCoupon(
      validCoupon({
        eligibilityType: "specific_users",
        eligibleUsers: ["bad-id"],
      }),
    ),
    null,
  );
  assert.equal(normalizeCoupon(validCoupon({ pincodes: ["46201"] })), null);
  assert.equal(
    normalizeCoupon(validCoupon({ paymentMethods: ["bitcoin"] })),
    null,
  );
});

test("specific-user coupons require a valid selected customer", () => {
  assert.equal(
    normalizeCoupon(validCoupon({ eligibilityType: "specific_users" })),
    null,
  );
  assert.ok(
    normalizeCoupon(
      validCoupon({
        eligibilityType: "specific_users",
        eligibleUsers: ["507f1f77bcf86cd799439011"],
      }),
    ),
  );
});

test("everyone coupons discard stale eligible users", () => {
  const coupon = normalizeCoupon(
    validCoupon({
      eligibilityType: "everyone",
      eligibleUsers: ["507f1f77bcf86cd799439011"],
    }),
  );

  assert.deepEqual(coupon.eligibleUsers, []);
});
