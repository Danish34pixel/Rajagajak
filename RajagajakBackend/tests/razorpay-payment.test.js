const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  verifyRazorpaySignature,
  isCapturedRazorpayPayment,
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
