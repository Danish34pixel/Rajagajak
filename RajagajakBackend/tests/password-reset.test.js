const { after, mock, test } = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://localhost/rajagajak-test";
process.env.JWT_SECRET = "password-reset-test-secret";
process.env.IMAGEKIT_PRIVATE_KEY = "private_password_reset_test";
process.env.FRONTEND_URL = "https://store.example.test";
process.env.FRONTEND_URLS = "http://localhost:5173";

const http = require("node:http");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const app = require("../src/app");
const env = require("../src/config/env");
const User = require("../src/models/User.model");
const authService = require("../src/services/auth.service");
const passwordResetEmail = require("../src/services/password-reset-email.service");
const {
  hashResetToken,
  requestPasswordReset,
  resetPassword,
  RESET_TOKEN_TTL_MS,
} = require("../src/services/password-reset.service");
const {
  validateEmail,
  validateResetPassword,
} = require("../src/validators/auth.validator");
const { authenticate } = require("../src/middleware/auth.middleware");

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

test("forgot-password returns a generic response and emails a hashed, expiring token", async (t) => {
  const issuedTokens = [];
  const registeredUser = {
    _id: "user-123",
    name: "Raja Customer",
    email: "member@example.com",
    save: async function save() {},
  };
  t.mock.method(User, "findOne", async ({ email }) =>
    email === registeredUser.email ? registeredUser : null,
  );
  t.mock.method(passwordResetEmail, "sendPasswordResetEmail", async (mail) => {
    issuedTokens.push(mail);
  });

  const registered = await post("/api/v1/auth/forgot-password", {
    email: " Member@Example.com ",
  });
  const unknown = await post("/api/v1/auth/forgot-password", {
    email: "missing@example.com",
  });

  assert.equal(registered.status, 200);
  assert.equal(unknown.status, 200);
  assert.deepEqual(registered.body, unknown.body);
  assert.equal(issuedTokens.length, 1);
  assert.equal(issuedTokens[0].email, registeredUser.email);
  assert.equal(issuedTokens[0].token.length, 43);
  assert.equal(registeredUser.resetPasswordTokenHash.length, 64);
  assert.notEqual(
    registeredUser.resetPasswordTokenHash,
    issuedTokens[0].token,
  );
  assert.equal(
    registeredUser.resetPasswordTokenHash,
    hashResetToken(issuedTokens[0].token),
  );
  const expiryDelta =
    registeredUser.resetPasswordExpires.getTime() - Date.now();
  assert.ok(expiryDelta > RESET_TOKEN_TTL_MS - 2000);
  assert.ok(expiryDelta <= RESET_TOKEN_TTL_MS);
  assert.equal(JSON.stringify(registered.body).includes(issuedTokens[0].token), false);
});

test("forgot-password cleans up a token without exposing delivery failures to clients", async (t) => {
  const user = {
    _id: "user-delivery-failure",
    email: "member@example.com",
    name: "Member",
    save: async function save() {},
  };
  let cleanup;
  const logged = [];
  t.mock.method(User, "findOne", async ({ email }) =>
    email === user.email ? user : null,
  );
  t.mock.method(User, "updateOne", async (...args) => {
    cleanup = args;
  });
  t.mock.method(passwordResetEmail, "sendPasswordResetEmail", async () => {
    throw new Error("Provider details and credentials must not leak.");
  });
  t.mock.method(console, "error", (...args) => logged.push(args));

  const response = await post("/api/v1/auth/forgot-password", {
    email: "member@example.com",
  });
  const unknown = await post("/api/v1/auth/forgot-password", {
    email: "missing@example.com",
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.deepEqual(response.body, unknown.body);
  assert.equal(cleanup[0]._id, user._id);
  assert.equal(cleanup[0].resetPasswordTokenHash, user.resetPasswordTokenHash);
  assert.deepEqual(cleanup[1].$unset, {
    resetPasswordTokenHash: 1,
    resetPasswordExpires: 1,
  });
  assert.equal(logged.length, 1);
  assert.equal(JSON.stringify(logged).includes("credentials"), false);
  assert.equal(
    JSON.stringify(logged).includes(user.resetPasswordTokenHash),
    false,
  );
});

test("reset-password hashes the replacement, clears token fields, and allows normal login", async (t) => {
  const token = "single-use-reset-token";
  const password = "new-password-value";
  const user = {
    _id: "user-123",
    email: "member@example.com",
    password: await bcrypt.hash("old-password-value", 12),
    role: "user",
    tokenVersion: 0,
  };
  let updateQuery;
  let update;
  let consumed = false;
  t.mock.method(User, "findOneAndUpdate", async (...args) => {
    [updateQuery, update] = args;
    if (consumed) return null;
    consumed = true;
    user.password = update.$set.password;
    user.tokenVersion += update.$inc.tokenVersion;
    return user;
  });

  assert.equal(await resetPassword(token, password), true);
  assert.equal(await resetPassword(token, password), false);
  assert.equal(updateQuery.resetPasswordTokenHash, hashResetToken(token));
  assert.ok(updateQuery.resetPasswordExpires.$gt instanceof Date);
  assert.equal(await bcrypt.compare(password, user.password), true);
  assert.equal(await bcrypt.compare("old-password-value", user.password), false);
  assert.deepEqual(update.$unset, {
    resetPasswordTokenHash: 1,
    resetPasswordExpires: 1,
  });
  assert.equal(update.$inc.tokenVersion, 1);

  t.mock.method(User, "findOne", () => ({
    select: async () => user,
  }));
  await assert.rejects(
    authService.loginUser(user.email, "old-password-value"),
    { statusCode: 401 },
  );
  const login = await authService.loginUser(user.email, password);
  assert.equal(login.user, user);
  assert.equal(
    jwt.verify(login.token, env.jwtSecret).tokenVersion,
    user.tokenVersion,
  );
});

test("reset-password rejects invalid, expired, and already-used tokens", async (t) => {
  let capturedQuery;
  t.mock.method(User, "findOneAndUpdate", async (query) => {
    capturedQuery = query;
    return null;
  });

  for (const token of ["expired-or-used-token", "another-token"]) {
    assert.equal(await resetPassword(token, "a-valid-password"), false);
    assert.equal(capturedQuery.resetPasswordTokenHash, hashResetToken(token));
    assert.ok(capturedQuery.resetPasswordExpires.$gt > new Date(0));
  }
});

test("reset endpoints validate password confirmation and apply rate limits", async () => {
  const mismatch = validateResetPassword({
    token: "a".repeat(43),
    password: "password-123",
    confirmPassword: "password-456",
  });
  assert.ok(mismatch.includes("Passwords do not match."));
  assert.equal(validateEmail("invalid-address"), false);

  const invalidReset = await post("/api/v1/auth/reset-password", {
    token: "a".repeat(43),
    password: "password-123",
    confirmPassword: "different-password",
  });
  assert.equal(invalidReset.status, 400);
  assert.ok(invalidReset.body.error.includes("Passwords do not match."));

  const responses = [];
  for (let attempt = 0; attempt < 11; attempt += 1) {
    responses.push(
      await post("/api/v1/auth/reset-password", {
        token: "short",
        password: "password-123",
        confirmPassword: "password-123",
      }),
    );
  }
  assert.equal(responses[0].status, 400);
  assert.equal(responses[10].status, 429);
});

test("password reset email uses the configured frontend URL and branded template", async (t) => {
  env.frontendUrl = "https://shop.example.test/store";
  env.smtpHost = "smtp.example.test";
  env.smtpPort = 587;
  env.smtpSecure = false;
  env.smtpUser = "mailer@example.test";
  env.smtpPass = "not-a-real-secret";
  env.emailFrom = "Raja Gajak <mailer@example.test>";
  let sentMail;
  t.mock.method(nodemailer, "createTransport", () => ({
    sendMail: async (message) => {
      sentMail = message;
    },
  }));

  await passwordResetEmail.sendPasswordResetEmail({
    email: "member@example.com",
    name: "Raja <Customer>",
    token: "safe-test-token",
  });

  assert.equal(sentMail.to, "member@example.com");
  assert.match(sentMail.subject, /Raja Gajak/);
  assert.match(sentMail.html, /Reset Password/);
  assert.match(sentMail.html, /30 minutes/);
  assert.match(sentMail.html, /Raja &lt;Customer&gt;/);
  assert.match(
    sentMail.html,
    /https:\/\/shop\.example\.test\/store\/reset-password\?token=safe-test-token/,
  );
  assert.match(sentMail.text, /ignore this email/);
});

test("password reset invalidates existing JWTs", async (t) => {
  const previousToken = jwt.sign(
    { sub: "user-123", tokenVersion: 0 },
    env.jwtSecret,
    { expiresIn: "1h" },
  );
  const currentUser = { tokenVersion: 1 };
  t.mock.method(User, "findById", () => ({
    select: async () => currentUser,
  }));
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextError;
  await authenticate(
    { headers: { authorization: `Bearer ${previousToken}` } },
    response,
    (error) => {
      nextError = error;
    },
  );

  assert.equal(response.statusCode, 401);
  assert.equal(nextError, undefined);
});
