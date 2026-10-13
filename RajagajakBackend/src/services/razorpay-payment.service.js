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

module.exports = { verifyRazorpaySignature, isCapturedRazorpayPayment };
