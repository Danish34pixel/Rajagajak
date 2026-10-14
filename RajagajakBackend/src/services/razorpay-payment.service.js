const crypto = require("crypto");

const verifyRazorpaySignature = ({
  orderId,
  paymentId,
  signature,
  keySecret,
}) => {
  if (!/^[a-f\d]{64}$/i.test(signature)) return false;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const received = Buffer.from(signature, "hex");
  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(received, expected)
  );
};

const isCapturedRazorpayPayment = ({
  order,
  payment,
  paymentId,
  expectedAmount,
  clientRequestId,
  userId,
}) =>
  order.status === "paid" &&
  order.currency === "INR" &&
  order.amount === expectedAmount &&
  order.amount_paid === expectedAmount &&
  order.amount_due === 0 &&
  order.notes?.clientRequestId === clientRequestId &&
  order.notes?.userId === String(userId) &&
  payment.id === paymentId &&
  payment.status === "captured" &&
  payment.captured === true &&
  payment.order_id === order.id &&
  payment.amount === expectedAmount &&
  payment.currency === "INR";

const getRazorpayConfigurationIssue = ({ keyId, keySecret }) => {
  if (!keyId || !keySecret) return "missing_credentials";
  if (keyId !== keyId.trim() || keySecret !== keySecret.trim())
    return "credential_whitespace";
  if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId))
    return "invalid_key_id";
  if (/\s/.test(keySecret)) return "invalid_key_secret_format";
  if (/your_|replace_with|example/i.test(keyId + keySecret))
    return "placeholder_credentials";
  return null;
};

const safeProviderField = (value, credentials) => {
  if (typeof value !== "string") return null;
  let safeValue = value.replace(/[\r\n\t]/g, " ").slice(0, 300);
  for (const credential of credentials) {
    if (credential) safeValue = safeValue.split(credential).join("[REDACTED]");
  }
  return safeValue
    .replace(/\b(Basic|Bearer)\s+\S+/gi, "$1 [REDACTED]")
    .trim() || null;
};

const getRazorpayErrorDiagnostics = (
  error,
  { keyId = "", keySecret = "", sensitiveValues = [] } = {},
) => {
  const providerError =
    error?.error || error?.response?.data?.error || error || {};
  const statusCode =
    Number(error?.statusCode || error?.status || error?.response?.status) ||
    null;
  const redactedValues = [keyId, keySecret, ...sensitiveValues];
  return {
    code: safeProviderField(providerError.code, redactedValues),
    description: safeProviderField(providerError.description, redactedValues),
    httpStatus: statusCode,
    reason: safeProviderField(providerError.reason, redactedValues),
  };
};

module.exports = {
  verifyRazorpaySignature,
  isCapturedRazorpayPayment,
  getRazorpayConfigurationIssue,
  getRazorpayErrorDiagnostics,
};
