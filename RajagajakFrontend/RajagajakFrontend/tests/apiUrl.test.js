import test from "node:test";
import assert from "node:assert/strict";
import { joinApiPath, normalizeApiBase } from "../src/utils/apiUrl.js";

test("normalizes the API host and removes accidental API prefixes", () => {
  assert.equal(
    normalizeApiBase("http://localhost:5000"),
    "http://localhost:5000",
  );
  assert.equal(
    normalizeApiBase("http://localhost:5000/api/v1/api/v1/"),
    "http://localhost:5000",
  );
  assert.equal(
    normalizeApiBase("http://localhost:5000/store/"),
    "http://localhost:5000/store",
  );
});

test("joins API endpoint paths without duplicate slashes or version prefixes", () => {
  const apiBase = normalizeApiBase("http://localhost:5000/api/v1/api/v1");
  const apiRoot = `${apiBase}/api/v1`;
  const compatibilityRoot = `${apiBase}/api`;

  assert.equal(
    joinApiPath(apiRoot, "/products"),
    "http://localhost:5000/api/v1/products",
  );
  assert.equal(
    joinApiPath(apiRoot, "auth/login"),
    "http://localhost:5000/api/v1/auth/login",
  );
  assert.equal(
    joinApiPath(apiRoot, "/auth/signup"),
    "http://localhost:5000/api/v1/auth/signup",
  );
  assert.equal(
    joinApiPath(apiRoot, "/payment/create-order"),
    "http://localhost:5000/api/v1/payment/create-order",
  );
  assert.equal(
    joinApiPath(compatibilityRoot, "/delivery/calculate"),
    "http://localhost:5000/api/delivery/calculate",
  );
});
