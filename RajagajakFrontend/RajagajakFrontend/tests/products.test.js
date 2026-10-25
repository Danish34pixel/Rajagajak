import test from "node:test";
import assert from "node:assert/strict";
import {
  getProductSuggestions,
  shuffleProducts,
} from "../src/utils/products.js";

const catalog = [
  { _id: "til", title: "Til Gajak", category: "Gajak" },
  { _id: "gur", title: "Gur Gajak", category: "Gajak" },
  { _id: "laddu", title: "Dry Fruit Laddu", category: "Sweets" },
  { _id: "rewari", title: "Rewari", category: "Gajak" },
  { _id: "chikki", title: "Peanut Chikki", category: "Chikki" },
];

test("shuffle returns the same products without mutating the catalog", () => {
  const original = [...catalog];
  const shuffled = shuffleProducts(catalog);

  assert.deepEqual(
    shuffled.map((item) => item._id).sort(),
    original.map((item) => item._id).sort(),
  );
  assert.deepEqual(catalog, original);
});

test("suggestions prefer matching categories and exclude the current product", () => {
  const suggestions = getProductSuggestions(catalog, catalog[0]);

  assert.equal(suggestions.length, 4);
  assert.equal(suggestions.some((item) => item._id === "til"), false);
  assert.ok(
    suggestions.slice(0, 2).every((item) => item.category === "Gajak"),
  );
  assert.equal(new Set(suggestions.map((item) => item._id)).size, suggestions.length);
});

test("suggestions fall back to other catalog products when categories do not match", () => {
  const suggestions = getProductSuggestions(
    catalog,
    { _id: "unknown", category: "Unavailable" },
    2,
  );

  assert.equal(suggestions.length, 2);
  assert.ok(suggestions.every((item) => item._id !== "unknown"));
});
