import test from "node:test";
import assert from "node:assert/strict";
import { getPageNumbers, getPageSlice } from "../src/utils/pagination.js";

test("slices products into pages of ten without overlap or omissions", () => {
  const products = Array.from({ length: 47 }, (_, index) => index + 1);
  const pages = Array.from({ length: 5 }, (_, index) =>
    getPageSlice(products, index + 1, 10),
  );

  assert.equal(pages[0].length, 10);
  assert.equal(pages[1].length, 10);
  assert.equal(pages[2].length, 10);
  assert.equal(pages[3].length, 10);
  assert.equal(pages[4].length, 7);
  assert.deepEqual(pages.flat(), products);
  assert.deepEqual(getPageSlice([], 1, 10), []);
});

test("returns all page numbers for short listings", () => {
  assert.deepEqual(getPageNumbers(4, 2), [1, 2, 3, 4]);
  assert.deepEqual(getPageNumbers(0, 1), []);
});

test("collapses distant page ranges with ellipses", () => {
  assert.deepEqual(getPageNumbers(12, 6), [1, "ellipsis", 5, 6, 7, "ellipsis", 12]);
  assert.deepEqual(getPageNumbers(8, 1), [1, 2, "ellipsis", 8]);
  assert.deepEqual(getPageNumbers(8, 8), [1, "ellipsis", 7, 8]);
});
