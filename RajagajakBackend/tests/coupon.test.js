const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateCoupon } = require("../src/services/coupon.service");

const baseItems = [
  {
    productId: "product-a",
    category: "Sweets",
    quantityKg: 2,
    pricePerKg: 300,
    mrpPerKg: 350,
    discountAmount: 100,
    taxableAmount: 600,
    gstPercentage: 12,
    gstAmount: 72,
    itemTotal: 672,
  },
  {
    productId: "product-b",
    category: "Snacks",
    quantityKg: 1,
    pricePerKg: 400,
    mrpPerKg: 400,
    discountAmount: 0,
    taxableAmount: 400,
    gstPercentage: 5,
    gstAmount: 20,
    itemTotal: 420,
  },
];
const baseCoupon = (overrides = {}) => ({
  _id: "coupon-a",
  code: "SAVE10",
  title: "Save 10",
  type: "percentage",
  discountValue: 10,
  minimumOrderValue: 0,
  minimumQuantity: 0,
  maximumDiscount: null,
  isActive: true,
  startDate: new Date("2020-01-01T00:00:00Z"),
  expiryDate: new Date("2035-01-01T00:00:00Z"),
  usedCount: 0,
  usageLimit: null,
  perUserLimit: null,
  eligibilityType: "everyone",
  applicableProducts: [],
  applicableCategories: [],
  cities: [],
  pincodes: [],
  paymentMethods: [],
  allowedDays: [],
  ...overrides,
});
const evaluate = (coupon, overrides = {}) =>
  evaluateCoupon({
    coupon: baseCoupon(coupon),
    items: baseItems,
    shipping: { distanceKm: 3, shippingCharge: 50 },
    shippingAddress: { city: "Bhopal", pincode: "462001" },
    userId: "user-a",
    now: new Date("2026-09-27T12:00:00Z"),
    ...overrides,
  });

test("percentage coupon applies maximum cap and reduces GST only on discounted taxable value", () => {
  const result = evaluate({ discountValue: 20, maximumDiscount: 50 });
  assert.equal(result.discount, 50);
  assert.equal(result.pricing.taxableAmount, 950);
  assert.equal(result.pricing.totalGST, 87.4);
  assert.equal(result.pricing.grandTotal, 1087.4);
});

test("fixed coupon is capped to eligible amount and limits product/category scope", () => {
  const result = evaluate({
    type: "fixed",
    discountType: "fixed",
    discountValue: 1000,
    applicableCategories: ["Sweets"],
  });
  assert.equal(result.discount, 600);
  assert.equal(result.items[0].couponDiscount, 600);
  assert.equal(result.items[1].couponDiscount, 0);
  assert.throws(
    () => evaluate({ type: "percentage", applicableProducts: ["missing"] }),
    /Coupon is not valid for this product/,
  );
});

test("free shipping and fixed shipping never increase the normal delivery charge", () => {
  const free = evaluate({ type: "free_shipping", discountValue: 0 });
  const fixed = evaluate({ type: "fixed_shipping", discountValue: 20 });
  const lowRate = evaluate(
    { type: "fixed_shipping", discountValue: 20 },
    { shipping: { distanceKm: 1, shippingCharge: 10 } },
  );
  assert.equal(free.finalShipping, 0);
  assert.equal(free.shippingDiscount, 50);
  assert.equal(fixed.finalShipping, 20);
  assert.equal(fixed.shippingDiscount, 30);
  assert.equal(lowRate.finalShipping, 10);
  assert.equal(lowRate.shippingDiscount, 0);
});

test("free shipping applies to everyone for COD and online despite stale user selections", () => {
  const item = {
    ...baseItems[0],
    quantityKg: 1,
    pricePerKg: 1,
    mrpPerKg: 1,
    discountAmount: 0,
    taxableAmount: 1,
    gstPercentage: 0,
    gstAmount: 0,
    itemTotal: 1,
  };

  for (const paymentMethod of ["cod", "razorpay"]) {
    const result = evaluate(
      {
        type: "free_shipping",
        discountValue: 0,
        minimumOrderValue: 1,
        minimumQuantity: 1,
        eligibilityType: "everyone",
        eligibleUsers: ["another-user"],
        cities: ["Bhopal"],
        pincodes: ["462001"],
        radiusKm: 100,
      },
      {
        items: [item],
        paymentMethod,
        shipping: {
          distanceKm: 2.8,
          shippingCharge: 50,
          location: { city: "Bhopal", pincode: "462001" },
        },
      },
    );

    assert.equal(result.discount, 0);
    assert.equal(result.shippingDiscount, 50);
    assert.equal(result.finalShipping, 0);
    assert.equal(result.pricing.grandTotal, 1);
  }
});

test("buy two get one uses only purchased eligible quantity", () => {
  const result = evaluate({
    type: "buy_x_get_y",
    buyQuantity: 2,
    getQuantity: 1,
    minimumOrderValue: 0,
  });
  assert.equal(result.discount, 300);
  assert.throws(
    () => evaluate({ type: "buy_x_get_y", buyQuantity: 3, getQuantity: 1 }),
    /Minimum quantity/,
  );
});

test("buy-get percent and fixed discounts cap correctly", () => {
  const percent = evaluate({
    type: "buy_x_get_percentage",
    buyQuantity: 1,
    getQuantity: 1,
    getDiscountPercentage: 50,
    maximumDiscount: 50,
  });
  const fixed = evaluate({
    type: "buy_x_get_fixed",
    buyQuantity: 1,
    getQuantity: 1,
    getDiscountAmount: 75,
  });
  assert.equal(percent.discount, 50);
  assert.equal(fixed.discount, 75);
});

test("minimum order, quantity, new-user, specific-user, location, payment, date, and usage rules reject ineligible orders", () => {
  const cases = [
    [{ minimumOrderValue: 2000 }, {}, /Minimum order value/],
    [{ minimumQuantity: 5 }, {}, /Minimum quantity/],
    [{ eligibilityType: "first_order" }, { userOrderCount: 1 }, /new users/],
    [
      { eligibilityType: "specific_users", eligibleUsers: ["other"] },
      {},
      /account/,
    ],
    [{ cities: ["Indore"] }, {}, /city/],
    [{ pincodes: ["452010"] }, {}, /pincode/],
    [{ radiusKm: 2 }, {}, /delivery area/],
    [{ paymentMethods: ["upi"] }, { paymentMethod: "cod" }, /payment method/],
    [{ expiryDate: new Date("2025-01-01") }, {}, /expired/],
    [{ startDate: new Date("2030-01-01") }, {}, /not active yet/],
    [{ usageLimit: 1, usedCount: 1 }, {}, /usage limit/],
    [{ perUserLimit: 1 }, { userCouponUseCount: 1 }, /maximum number/],
  ];
  for (const [coupon, context, expected] of cases)
    assert.throws(() => evaluate(coupon, context), expected);
});

test("coupon discount and shipping snapshot preserves one-coupon breakdown", () => {
  const result = evaluate({ discountValue: 10 });
  assert.equal(result.pricing.subtotal, 1100);
  assert.equal(result.pricing.discount, 100);
  assert.equal(result.pricing.couponDiscount, 100);
  assert.equal(result.pricing.shippingCharges, 50);
  assert.equal(result.pricing.grandTotal, 1032.8);
  assert.equal(result.coupon.code, "SAVE10");
});

test("city and pincode restrictions require geocoder-resolved delivery locality", () => {
  const coupon = { cities: ["Bhopal"], pincodes: ["462001"] };
  assert.throws(() => evaluate(coupon), /city/);
  const result = evaluate(coupon, {
    shipping: {
      distanceKm: 3,
      shippingCharge: 50,
      location: { city: "Bhopal", state: "Madhya Pradesh", pincode: "462001" },
    },
  });
  assert.equal(result.finalShipping, 50);
});

test("allowed weekday and unsupported campaign rules are enforced", () => {
  assert.doesNotThrow(() => evaluate({ allowedDays: [0] }));
  assert.throws(() => evaluate({ allowedDays: [1] }), /not valid today/);
  assert.throws(
    () => evaluate({ eligibilityType: "referral" }),
    /not available yet/,
  );
});

test("fixed discount never exceeds the eligible order amount", () => {
  const result = evaluate({
    type: "fixed",
    discountType: "fixed",
    discountValue: 2000,
    applicableProducts: ["product-a"],
  });
  assert.equal(result.discount, 600);
  assert.equal(result.pricing.taxableAmount, 400);
});

test("single preview supports only one coupon calculation and shipping coupons preserve product discounts", () => {
  const result = evaluate({ type: "free_shipping", discountValue: 0 });
  assert.equal(result.coupon.code, "SAVE10");
  assert.equal(result.pricing.discount, 100);
  assert.equal(result.pricing.couponDiscount, 0);
  assert.equal(result.pricing.shippingDiscount, 50);
  assert.equal(result.pricing.totalGST, 92);
  assert.equal(result.pricing.grandTotal, 1092);
});
