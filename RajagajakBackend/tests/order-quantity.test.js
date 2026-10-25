process.env.MONGO_URI ||= "mongodb://localhost/rajagajak-test";
process.env.JWT_SECRET ||= "test-jwt-secret";

const test = require("node:test");
const assert = require("node:assert/strict");
const Product = require("../src/models/Product.model");
const { calculateItems } = require("../src/controllers/order.controller");

const productId = "507f1f77bcf86cd799439011";
const product = {
  _id: productId,
  title: "Test Product",
  category: "Test",
  images: [],
  image: "",
  finalPrice: 200,
  mrp: 250,
  discount: 20,
  gstPercentage: 0,
  stock: 10,
};

test("300 g, 500 g, 700 g, and 1 kg use trusted per-kg product prices", async () => {
  const originalFindById = Product.findById;
  Product.findById = async () => product;
  try {
    for (const [quantityKg, expectedPrice] of [
      [0.3, 60],
      [0.5, 100],
      [0.7, 140],
      [0.333, 66.6],
      [1, 200],
    ]) {
      const [item] = await calculateItems([
        { productId, quantityKg, pricePerKg: 1 },
      ]);
      assert.equal(item.snapshot.quantityKg, quantityKg);
      assert.equal(item.snapshot.pricePerKg, 200);
      assert.equal(item.snapshot.taxableAmount, expectedPrice);
      assert.equal(item.snapshot.itemTotal, expectedPrice);
    }
  } finally {
    Product.findById = originalFindById;
  }
});

test("order quantity validation rejects invalid, negative, too-small, and sub-gram quantities", async () => {
  const originalFindById = Product.findById;
  Product.findById = async () => product;
  try {
    for (const quantityKg of [-0.3, 0, 0.1, 0.2, 0.3335]) {
      await assert.rejects(
        calculateItems([{ productId, quantityKg }]),
        /Invalid order item quantity/,
      );
    }
  } finally {
    Product.findById = originalFindById;
  }
});

test("custom gram quantities above 12 kg are priced from the catalog rate", async () => {
  const originalFindById = Product.findById;
  Product.findById = async () => ({ ...product, stock: 100 });
  try {
    for (const [quantityKg, expectedPrice] of [
      [12, 2400],
      [15, 3000],
      [25, 5000],
      [50, 10000],
      [100, 20000],
    ]) {
      const [item] = await calculateItems([{ productId, quantityKg }]);
      assert.equal(item.snapshot.quantityKg, quantityKg);
      assert.equal(item.snapshot.taxableAmount, expectedPrice);
    }
  } finally {
    Product.findById = originalFindById;
  }
});

test("custom quantity above actual product stock is rejected without reducing it", async () => {
  const originalFindById = Product.findById;
  Product.findById = async () => product;
  try {
    await assert.rejects(
      calculateItems([{ productId, quantityKg: 15 }]),
      /Only 10 KG is available/,
    );
  } finally {
    Product.findById = originalFindById;
  }
});
