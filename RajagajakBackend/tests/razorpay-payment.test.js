const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  verifyRazorpaySignature,
  isCapturedRazorpayPayment,
  getRazorpayConfigurationIssue,
  getRazorpayErrorDiagnostics,
} = require("../src/services/razorpay-payment.service");

const keySecret = "test-secret";
const signatureFor = (orderId, paymentId) =>
  crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

test("Razorpay signature verification only accepts the matching HMAC", () => {
  const signature = signatureFor("order_123", "pay_123");
  assert.equal(
    verifyRazorpaySignature({
      orderId: "order_123",
      paymentId: "pay_123",
      signature,
      keySecret,
    }),
    true,
  );
  assert.equal(
    verifyRazorpaySignature({
      orderId: "order_123",
      paymentId: "pay_123",
      signature: "invalid",
      keySecret,
    }),
    false,
  );
});

test("a payment is valid only when Razorpay confirms the matching full capture", () => {
  const gatewayOrder = {
    id: "order_123",
    status: "paid",
    currency: "INR",
    amount: 12000,
    amount_paid: 12000,
    amount_due: 0,
    notes: { clientRequestId: "request_123", userId: "user_123" },
  };
  const gatewayPayment = {
    id: "pay_123",
    order_id: "order_123",
    status: "captured",
    captured: true,
    amount: 12000,
    currency: "INR",
  };
  const verifiedPayment = {
    order: gatewayOrder,
    payment: gatewayPayment,
    paymentId: "pay_123",
    expectedAmount: 12000,
    clientRequestId: "request_123",
    userId: "user_123",
  };
  assert.equal(isCapturedRazorpayPayment(verifiedPayment), true);
  assert.equal(
    isCapturedRazorpayPayment({
      ...verifiedPayment,
      payment: { ...gatewayPayment, status: "authorized", captured: false },
    }),
    false,
  );
  assert.equal(
    isCapturedRazorpayPayment({
      ...verifiedPayment,
      expectedAmount: 12001,
    }),
    false,
  );
  assert.equal(
    isCapturedRazorpayPayment({
      ...verifiedPayment,
      userId: "another-user",
    }),
    false,
  );
});

test("Razorpay configuration requires a recognized mode key and clean credentials", () => {
  assert.equal(
    getRazorpayConfigurationIssue({
      keyId: "rzp_test_abc123",
      keySecret: "opaque-secret",
    }),
    null,
  );
  assert.equal(
    getRazorpayConfigurationIssue({
      keyId: "rzp_live_abc123",
      keySecret: "opaque-secret",
    }),
    null,
  );
  assert.equal(
    getRazorpayConfigurationIssue({
      keyId: "RAZORPAY_KEY_ID",
      keySecret: "opaque-secret",
    }),
    "invalid_key_id",
  );
  assert.equal(
    getRazorpayConfigurationIssue({
      keyId: "rzp_test_abc123 ",
      keySecret: "opaque-secret",
    }),
    "credential_whitespace",
  );
  assert.equal(
    getRazorpayConfigurationIssue({
      keyId: "rzp_test_abc123",
      keySecret: "opaque secret",
    }),
    "invalid_key_secret_format",
  );
  assert.equal(
    getRazorpayConfigurationIssue({ keyId: "", keySecret: "" }),
    "missing_credentials",
  );
});

test("Razorpay provider diagnostics retain safe fields and redact credentials", () => {
  const diagnostics = getRazorpayErrorDiagnostics(
    {
      statusCode: 401,
      error: {
        code: "BAD_REQUEST_ERROR",
        description: "Invalid key rzp_test_sensitive",
        reason: "authentication_failed",
      },
    },
    {
      keyId: "rzp_test_sensitive",
      keySecret: "secret-sensitive",
    },
  );
  assert.deepEqual(diagnostics, {
    code: "BAD_REQUEST_ERROR",
    description: "Invalid key [REDACTED]",
    httpStatus: 401,
    reason: "authentication_failed",
  });
  assert.equal(
    getRazorpayErrorDiagnostics({
      response: {
        status: 502,
        data: { error: { description: "Provider unavailable" } },
      },
    }).httpStatus,
    502,
  );
});
