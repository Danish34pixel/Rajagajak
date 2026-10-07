const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateProfileUpdate,
  validateSignup,
} = require("../src/validators/auth.validator");
const User = require("../src/models/User.model");

const validSignup = {
  name: "Test User",
  mobile: "9876543210",
  email: "test@example.com",
  address: {
    addressLine1: "12 Main Street",
    addressLine2: "Central Area",
    city: "Bhopal",
    state: "Madhya Pradesh",
    country: "India",
    pincode: "462001",
  },
  pinCode: "462001",
  password: "secure-password",
};

test("signup accepts structured addresses with required location fields", () => {
  assert.deepEqual(validateSignup(validSignup), []);
});

test("signup rejects structured addresses without line 1, city, or state", () => {
  for (const field of ["addressLine1", "city", "state"]) {
    const signup = {
      ...validSignup,
      address: { ...validSignup.address, [field]: "" },
    };
    assert.ok(validateSignup(signup).some((error) => error.includes("Address")));
  }
});

test("signup retains compatibility with existing string-address clients", () => {
  assert.deepEqual(
    validateSignup({ ...validSignup, address: "12 Main Street" }),
    [],
  );
});

test("profile update accepts both structured and legacy string addresses", () => {
  const profile = { ...validSignup };
  assert.deepEqual(validateProfileUpdate(profile), []);
  assert.deepEqual(
    validateProfileUpdate({ ...profile, address: "12 Main Street" }),
    [],
  );
});

test("user schema preserves legacy string and accepts structured addresses", async () => {
  const baseUser = {
    name: "Test User",
    mobile: "9876543210",
    email: "test@example.com",
    pinCode: "462001",
    password: "hashed-password",
  };
  const oldUser = new User({ ...baseUser, address: "12 Main Street" });
  const newUser = new User({ ...baseUser, address: validSignup.address });

  assert.equal(await oldUser.validate(), undefined);
  assert.equal(await newUser.validate(), undefined);
  assert.deepEqual(newUser.toSafeObject().address, validSignup.address);
});
