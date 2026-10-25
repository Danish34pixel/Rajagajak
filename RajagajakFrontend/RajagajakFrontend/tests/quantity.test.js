import test from "node:test";
import assert from "node:assert/strict";
import {
  getSelectableMaxStockKg,
  isValidCustomQuantityKg,
  normalizeQuantityKg,
} from "../src/utils/quantity.js";

test("custom weight accepts gram increments from the minimum through available stock", () => {
  assert.equal(isValidCustomQuantityKg(0.3, 2), true);
  assert.equal(isValidCustomQuantityKg(0.35, 2), true);
  assert.equal(isValidCustomQuantityKg(1.257, 2), true);
  assert.equal(isValidCustomQuantityKg(15, 50), true);
  assert.equal(isValidCustomQuantityKg(25, 50), true);
  assert.equal(isValidCustomQuantityKg(50, 50), true);
  assert.equal(isValidCustomQuantityKg(2, 2), true);
});

test("custom weight rejects amounts below minimum, above stock, and sub-gram precision", () => {
  assert.equal(isValidCustomQuantityKg(0.2, 2), false);
  assert.equal(isValidCustomQuantityKg(2.1, 2), false);
  assert.equal(isValidCustomQuantityKg(0.3505, 2), false);
  assert.equal(isValidCustomQuantityKg("", 2), false);
});

test("custom weight respects the selectable stock rounded down to grams", () => {
  const maxStock = getSelectableMaxStockKg(1.29);

  assert.equal(maxStock, 1.29);
  assert.equal(isValidCustomQuantityKg(1.29, maxStock), true);
  assert.equal(isValidCustomQuantityKg(1.291, maxStock), false);
});

test("custom weight maximum follows actual stock without a 12 kg cap", () => {
  assert.equal(getSelectableMaxStockKg(20), 20);
  assert.equal(getSelectableMaxStockKg(50), 50);
  assert.equal(isValidCustomQuantityKg(15, getSelectableMaxStockKg(20)), true);
  assert.equal(isValidCustomQuantityKg(25, getSelectableMaxStockKg(50)), true);
  assert.equal(isValidCustomQuantityKg(50, getSelectableMaxStockKg(50)), true);
  assert.equal(isValidCustomQuantityKg(15, getSelectableMaxStockKg(12)), false);
});

test("cart quantity normalization retains custom gram increments", () => {
  assert.equal(normalizeQuantityKg(1.257), 1.257);
});

test("displayed totals use the selected kilogram amount", () => {
  const pricePerKg = 560;
  const cases = [
    [0.3, 168],
    [0.5, 280],
    [1, 560],
    [2, 1120],
    [12, 6720],
    [15, 8400],
    [25, 14000],
    [50, 28000],
  ];

  cases.forEach(([quantity, expectedTotal]) => {
    assert.equal(normalizeQuantityKg(quantity) * pricePerKg, expectedTotal);
  });
});
