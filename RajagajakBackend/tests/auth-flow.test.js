const { after, mock, test } = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://localhost/rajagajak-test";
process.env.JWT_SECRET = "auth-flow-test-secret";
process.env.IMAGEKIT_PRIVATE_KEY = "private_auth_flow_test";
process.env.FRONTEND_URLS = "http://localhost:5173";

const http = require("node:http");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const env = require("../src/config/env");
const User = require("../src/models/User.model");
const Order = require("../src/models/Order.model");
const { createToken } = require("../src/services/auth.service");
const { requireAdmin } = require("../src/middleware/admin.middleware");

const server = http.createServer(app);
let baseUrl;
const serverReady = new Promise((resolve) => {
  server.listen(0, "127.0.0.1", () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
});

after(async () => {
  await serverReady;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

const post = async (path, body) => {
  await serverReady;
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

const get = async (path, token) => {
  await serverReady;
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: response.status, body: await response.json() };
};

const patch = async (path, token, body) => {
  await serverReady;
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};

const createUser = (overrides = {}) => {
  const id = overrides.id || "auth-flow-user";
  return {
    _id: { toString: () => id },
    name: "Test Customer",
    email: "customer@example.com",
    mobile: "9876543210",
    address: "12 Main Street",
    pinCode: "462001",
    role: "user",
    tokenVersion: 0,
    ...overrides,
    toSafeObject() {
      return {
        id,
        name: this.name,
        mobile: this.mobile || null,
        email: this.email || null,
        address: this.address,
        pinCode: this.pinCode,
        role: this.role,
      };
    },
  };
};

const validSignup = (overrides = {}) => ({
  name: "Test Customer",
  email: "customer@example.com",
  mobile: "9876543210",
  registrationMethod: "email",
  address: {
    addressLine1: "12 Main Street",
    city: "Bhopal",
    state: "Madhya Pradesh",
    country: "India",
  },
  pinCode: "462001",
  password: "secure-password",
  ...overrides,
});

test("email and mobile login return the same response shape and JWT session", async (t) => {
  const password = "secure-password";
  const user = createUser({
    password: await bcrypt.hash(password, 4),
    tokenVersion: 0,
  });
  const lookups = [];
  t.mock.method(User, "findOne", (query) => {
    lookups.push(query);
    return { select: async () => user };
  });

  const emailLogin = await post("/api/v1/auth/login", {
    email: "CUSTOMER@example.com",
    password,
  });
  const mobileLogin = await post("/api/v1/auth/login", {
    mobile: "+919876543210",
    password,
  });

  assert.equal(emailLogin.status, 200);
  assert.equal(mobileLogin.status, 200);
  assert.deepEqual(
    Object.keys(emailLogin.body.data).sort(),
    Object.keys(mobileLogin.body.data).sort(),
  );
  assert.deepEqual(
    Object.keys(emailLogin.body.data.user).sort(),
    Object.keys(mobileLogin.body.data.user).sort(),
  );
  assert.deepEqual(lookups, [
    { email: "customer@example.com" },
    { mobile: "9876543210" },
  ]);
  assert.equal(jwt.verify(mobileLogin.body.data.token, env.jwtSecret).sub, user._id.toString());
});

test("email signup remains compatible and stores a bcrypt hash", async (t) => {
  let createdUser;
  t.mock.method(User, "findOne", async () => null);
  t.mock.method(User, "create", async (data) => {
    createdUser = data;
    return createUser(data);
  });

  const response = await post(
    "/api/v1/auth/signup",
    validSignup({ email: " CUSTOMER@example.com ", mobile: undefined }),
  );

  assert.equal(response.status, 201);
  assert.equal(createdUser.email, "customer@example.com");
  assert.equal(createdUser.mobile, undefined);
  assert.notEqual(createdUser.password, "secure-password");
  assert.equal(await bcrypt.compare("secure-password", createdUser.password), true);
});

test("mobile signup accepts +91 and stores one normalized customer identifier", async (t) => {
  let createdUser;
  t.mock.method(User, "findOne", async () => null);
  t.mock.method(User, "create", async (data) => {
    createdUser = data;
    return createUser(data);
  });

  const response = await post(
    "/api/v1/auth/signup",
    validSignup({
      email: "",
      mobile: "+919876543210",
      registrationMethod: "mobile",
    }),
  );

  assert.equal(response.status, 201);
  assert.equal(createdUser.email, undefined);
  assert.equal(createdUser.mobile, "9876543210");
  assert.equal(response.body.data.user.email, null);
});

test("signup rejects invalid and duplicate email or mobile identifiers", async (t) => {
  const existingUser = createUser();
  t.mock.method(User, "findOne", async (query) => {
    const identifiers = query.$or || [];
    return identifiers.some(
      (identifier) =>
        identifier.email === "existing@example.com" ||
        identifier.mobile === "9876543210",
    )
      ? existingUser
      : null;
  });

  const invalidMobile = await post(
    "/api/v1/auth/signup",
    validSignup({
      email: "",
      mobile: "1234567890",
      registrationMethod: "mobile",
    }),
  );
  const duplicateEmail = await post(
    "/api/v1/auth/signup",
    validSignup({ email: "existing@example.com", mobile: undefined }),
  );
  const duplicateMobile = await post(
    "/api/v1/auth/signup",
    validSignup({
      email: "",
      mobile: "9876543210",
      registrationMethod: "mobile",
    }),
  );

  assert.equal(invalidMobile.status, 400);
  assert.equal(duplicateEmail.status, 409);
  assert.equal(duplicateMobile.status, 409);
});

test("incorrect and unknown login identifiers produce the same credential error", async (t) => {
  const user = createUser({ password: await bcrypt.hash("correct-password", 4) });
  t.mock.method(User, "findOne", (query) => ({
    select: async () =>
      query.email === user.email || query.mobile === user.mobile ? user : null,
  }));

  const incorrectPassword = await post("/api/v1/auth/login", {
    email: user.email,
    password: "incorrect-password",
  });
  const unknownAccount = await post("/api/v1/auth/login", {
    mobile: "9123456789",
    password: "incorrect-password",
  });
  const invalidMobile = await post("/api/v1/auth/login", {
    mobile: "1234567890",
    password: "incorrect-password",
  });

  assert.equal(incorrectPassword.status, 401);
  assert.deepEqual(incorrectPassword.body, unknownAccount.body);
  assert.equal(invalidMobile.status, 400);
});

test("JWT-authenticated profile access and admin authorization remain supported", async (t) => {
  const user = createUser();
  const query = {
    select: async () => user,
    then: (resolve, reject) => Promise.resolve(user).then(resolve, reject),
  };
  t.mock.method(User, "findById", () => query);

  const token = createToken(user);
  const profile = await get("/api/v1/auth/profile", token);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.data.user.id, user._id.toString());
  t.mock.method(Order, "find", (query) => ({
    sort: async () => [{ userId: query.userId, orderNumber: "RJG-TEST-ORDER" }],
  }));
  const orders = await get("/api/v1/orders/my-orders", token);
  assert.equal(orders.status, 200);
  assert.equal(orders.body.data[0].userId, user._id.toString());

  const admin = createUser({ id: "admin-user", role: "admin" });
  const adminPayload = jwt.verify(createToken(admin), env.jwtSecret);
  let continued = false;
  const response = {
    status() {
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  t.mock.method(User, "findById", () => ({
    select: async () => admin,
  }));
  await requireAdmin(
    { user: { sub: admin._id.toString(), role: adminPayload.role } },
    response,
    () => {
      continued = true;
    },
  );

  assert.equal(adminPayload.role, "admin");
  assert.equal(continued, true);
});

test("profile settings allow adding a missing identifier but reject changing one", async (t) => {
  const mobileUser = createUser({ id: "mobile-only-user", email: null });
  const emailUser = createUser({ id: "email-only-user", mobile: null });
  const users = {
    [mobileUser._id.toString()]: mobileUser,
    [emailUser._id.toString()]: emailUser,
  };
  for (const user of Object.values(users)) user.save = async () => {};
  t.mock.method(User, "findById", (id) => {
    const user = users[id];
    return {
      select: async () => user,
      then: (resolve, reject) => Promise.resolve(user).then(resolve, reject),
    };
  });

  const mobileUserToken = createToken(mobileUser);
  const emailUserToken = createToken(emailUser);
  const emailAddition = await patch(
    "/api/v1/auth/profile",
    mobileUserToken,
    {
      name: mobileUser.name,
      mobile: mobileUser.mobile,
      email: "added@example.com",
      address: mobileUser.address,
      pinCode: mobileUser.pinCode,
    },
  );
  const mobileAddition = await patch("/api/v1/auth/profile", emailUserToken, {
    name: emailUser.name,
    mobile: "9123456789",
    email: emailUser.email,
    address: emailUser.address,
    pinCode: emailUser.pinCode,
  });
  const changedEmail = await patch("/api/v1/auth/profile", mobileUserToken, {
    name: mobileUser.name,
    mobile: mobileUser.mobile,
    email: "different@example.com",
    address: mobileUser.address,
    pinCode: mobileUser.pinCode,
  });

  assert.equal(emailAddition.status, 200);
  assert.equal(emailAddition.body.data.user.email, "added@example.com");
  assert.equal(mobileAddition.status, 200);
  assert.equal(mobileAddition.body.data.user.mobile, "9123456789");
  assert.equal(changedEmail.status, 400);
});

test("login is rate limited", async (t) => {
  const user = createUser({ password: await bcrypt.hash("secure-password", 4) });
  t.mock.method(User, "findOne", () => ({ select: async () => user }));

  let response;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    response = await post("/api/v1/auth/login", {
      email: user.email,
      password: "secure-password",
    });
    if (response.status === 429) break;
  }

  assert.equal(response.status, 429);
});
