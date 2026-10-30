process.env.MONGO_URI ||= "mongodb://localhost/rajagajak-test";

const test = require("node:test");
const assert = require("node:assert/strict");
const Product = require("../src/models/Product.model");
const { normalizeProduct } = require("../src/controllers/product.controller");

const validProduct = {
  title: "Til Gajak",
  mrp: 1000,
  discount: 10,
  gstPercentage: 0,
  stock: 5,
  images: ["https://example.com/til-gajak.jpg"],
  bulletPoints: ["Crunchy texture", "Made with sesame"],
};

test("product descriptions and admin bullet points normalize independently", () => {
  const product = normalizeProduct({
    ...validProduct,
    description: "  A full description. A second sentence.  ",
    bulletPoints: [" Crunchy texture ", "", " Made with sesame "],
  });

  assert.equal(product.description, "A full description. A second sentence.");
  assert.deepEqual(product.bulletPoints, [
    "Crunchy texture",
    "Made with sesame",
  ]);
  assert.equal(Product.schema.path("description").instance, "String");
});

test("omitted descriptions are excluded so updates do not erase saved text", () => {
  const product = normalizeProduct(validProduct);

  assert.equal(Object.hasOwn(product, "description"), false);
  assert.deepEqual(product.bulletPoints, validProduct.bulletPoints);
});

test("empty admin bullet points normalize to an empty list", () => {
  const product = normalizeProduct({
    ...validProduct,
    bulletPoints: ["", "  "],
  });

  assert.deepEqual(product.bulletPoints, []);
});
