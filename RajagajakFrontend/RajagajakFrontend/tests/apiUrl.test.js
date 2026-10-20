import test from "node:test";
import assert from "node:assert/strict";
import { joinApiPath, normalizeApiBase } from "../src/utils/apiUrl.js";

test("normalizes the API host and removes accidental API prefixes", () => {
  assert.equal(
    normalizeApiBase("https://api.rajagajak.tech/0"),
    "https://api.rajagajak.tech/0",
  );
  assert.equal(
    normalizeApiBase("https://api.rajagajak.tech/0/api/v1/api/v1/"),
    "https://api.rajagajak.tech/0",
  );
  assert.equal(
    normalizeApiBase("https://api.rajagajak.tech/0/store/"),
    "https://api.rajagajak.tech/0/store",
  );
});

test("joins API endpoint paths without duplicate slashes or version prefixes", () => {
  const apiBase = normalizeApiBase(
    "https://api.rajagajak.tech/0/api/v1/api/v1",
  );
  const apiRoot = `${apiBase}/api/v1`;
  const compatibilityRoot = `${apiBase}/api`;

  assert.equal(
    joinApiPath(apiRoot, "/products"),
    "https://api.rajagajak.tech/0/api/v1/products",
  );
  assert.equal(
    joinApiPath(apiRoot, "auth/login"),
    "https://api.rajagajak.tech/0/api/v1/auth/login",
  );
  assert.equal(
    joinApiPath(apiRoot, "/auth/signup"),
    "https://api.rajagajak.tech/0/api/v1/auth/signup",
  );
  assert.equal(
    joinApiPath(apiRoot, "/payment/create-order"),
    "https://api.rajagajak.tech/0/api/v1/payment/create-order",
  );
  assert.equal(
    joinApiPath(compatibilityRoot, "/delivery/calculate"),
    "https://api.rajagajak.tech/0/api/delivery/calculate",
  );
});
