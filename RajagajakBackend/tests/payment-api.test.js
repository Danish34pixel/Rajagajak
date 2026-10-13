const test = require("node:test");
const assert = require("node:assert/strict");
const { createOrder } = require("../src/controllers/order.controller");
const {
  createRazorpayOrder,
  verifyPayment,
} = require("../src/controllers/payment.controller");

const callController = async (controller, paymentMethod) => {
  const response = {
    statusCode: 200,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await controller({ body: { paymentMethod } }, response, (error) => {
    throw error;
  });
  return response;
};

test("order and payment APIs reject Cash on Delivery requests", async () => {
  for (const controller of [createOrder, createRazorpayOrder, verifyPayment]) {
    const response = await callController(controller, "cod");
    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
  }
});
