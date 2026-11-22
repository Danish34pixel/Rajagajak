const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateProfileUpdate,
  validateSignup,
  normalizeIndianMobile,
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

test("signup allows email-only and mobile-only registration", () => {
  const { email, mobile, ...requiredFields } = validSignup;
  assert.deepEqual(
    validateSignup({
      ...requiredFields,
      email,
      mobile: "",
      registrationMethod: "email",
    }),
    [],
  );
  assert.deepEqual(
    validateSignup({
      ...requiredFields,
      email: "",
      mobile,
      registrationMethod: "mobile",
    }),
    [],
  );
});

test("signup rejects invalid mobile identifiers and normalizes +91 numbers", () => {
  assert.ok(
    validateSignup({
      ...validSignup,
      email: "",
      mobile: "1234567890",
      registrationMethod: "mobile",
    }).some((error) => error.includes("Mobile")),
  );
  assert.equal(normalizeIndianMobile("+919876543210"), "9876543210");
  assert.equal(normalizeIndianMobile("9876543210"), "9876543210");
  assert.equal(normalizeIndianMobile("+911234567890"), null);
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

test("user schema accepts either login identifier but not neither", async () => {
  const baseUser = {
    name: "Test User",
    pinCode: "462001",
    password: "hashed-password",
    address: "12 Main Street",
  };
  const emailUser = new User({ ...baseUser, email: "test@example.com" });
  const mobileUser = new User({ ...baseUser, mobile: "9876543210" });
  const noIdentifierUser = new User(baseUser);

  assert.equal(await emailUser.validate(), undefined);
  assert.equal(await mobileUser.validate(), undefined);
  await assert.rejects(noIdentifierUser.validate(), /email address or mobile number/);

  const identifierIndexes = User.schema
    .indexes()
    .filter(([keys]) => keys.email === 1 || keys.mobile === 1);
  assert.deepEqual(
    identifierIndexes.map(([keys, options]) => [
      Object.keys(keys)[0],
      options.unique,
      options.partialFilterExpression[Object.keys(keys)[0]].$type,
    ]),
    [
      ["email", true, "string"],
      ["mobile", true, "string"],
    ],
  );
});
