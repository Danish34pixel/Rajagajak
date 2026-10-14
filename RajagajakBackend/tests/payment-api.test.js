const test = require("node:test");
const assert = require("node:assert/strict");
const { createOrder } = require("../src/controllers/order.controller");
const {
  createRazorpayOrder,
  createRazorpayOrderHandler,
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

const invokeCreateOrder = async ({
  body = {},
  buildOrder = async () => ({
    pricing: { grandTotal: 52.5 },
    items: [],
  }),
  createProviderOrder = async ({ amount, currency, receipt }) => ({
    id: "order_test_123",
    amount,
    currency,
    receipt,
  }),
  keyId = "rzp_live_public",
  keySecret = "secret-do-not-log",
} = {}) => {
  const logs = [];
  const providerRequests = [];
  const handler = createRazorpayOrderHandler({
    client: {
      orders: {
        create: async (payload) => {
          providerRequests.push(payload);
          return createProviderOrder(payload);
        },
      },
    },
    keyId,
    keySecret,
    buildOrder,
    logger: {
      error: (...values) => logs.push(values),
      warn: (...values) => logs.push(values),
    },
  });
  let resolveResponse;
  const responseComplete = new Promise((resolve) => {
    resolveResponse = resolve;
  });
  const response = {
    statusCode: 200,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(payload) {
      this.body = payload;
      resolveResponse();
      return this;
    },
  };
  const nextErrors = [];
  handler(
    {
      body: {
        clientRequestId: "client_request_123",
        paymentMethod: "razorpay",
        items: [{ productId: "product_1", quantityKg: 1 }],
        amount: 1,
        ...body,
      },
      user: { sub: "user_123" },
    },
    response,
    (error) => nextErrors.push(error),
  );
  await responseComplete;
  assert.deepEqual(nextErrors, []);
  return { response, logs, providerRequests };
};

test("Razorpay order uses server-calculated amount, INR and returned order data", async () => {
  const result = await invokeCreateOrder();
  assert.equal(result.response.statusCode, 200);
  assert.equal(result.response.body.success, true);
  assert.equal(result.providerRequests[0].amount, 5250);
  assert.equal(result.providerRequests[0].currency, "INR");
  assert.equal(result.response.body.data.razorpayOrder.id, "order_test_123");
  assert.equal(result.response.body.data.razorpayOrder.amount, 5250);
});

test("invalid payment method and missing request id are rejected without provider calls", async () => {
  const invalidMethod = await invokeCreateOrder({
    body: { paymentMethod: "cod" },
  });
  assert.equal(invalidMethod.response.statusCode, 400);
  assert.equal(invalidMethod.providerRequests.length, 0);

  const invalidRequestId = await invokeCreateOrder({
    body: { clientRequestId: "" },
  });
  assert.equal(invalidRequestId.response.statusCode, 400);
  assert.equal(invalidRequestId.providerRequests.length, 0);
});

test("invalid coupon and shipping input return client errors", async () => {
  const invalidCoupon = await invokeCreateOrder({
    buildOrder: async () => {
      throw Object.assign(new Error("Coupon has expired."), { statusCode: 400 });
    },
  });
  assert.equal(invalidCoupon.response.statusCode, 400);
  assert.match(invalidCoupon.response.body.message, /Coupon has expired/);
  assert.equal(invalidCoupon.providerRequests.length, 0);

  const invalidShipping = await invokeCreateOrder({
    buildOrder: async () => {
      throw Object.assign(new Error("Please enter a valid delivery address."), {
        statusCode: 400,
      });
    },
  });
  assert.equal(invalidShipping.response.statusCode, 400);
  assert.equal(invalidShipping.providerRequests.length, 0);
});

test("provider authentication failures are logged safely and returned as gateway errors", async () => {
  const secret = "secret-do-not-log";
  const result = await invokeCreateOrder({
    createProviderOrder: async () => {
      throw {
        statusCode: 401,
        error: {
          code: "BAD_REQUEST_ERROR",
          description: `Authentication failed for ${secret}, user_123, client_request_123`,
          reason: "authentication_failed",
        },
      };
    },
    keySecret: secret,
  });
  assert.equal(result.response.statusCode, 502);
  assert.match(result.response.body.message, /credentials/);
  assert.equal(JSON.stringify(result.response.body).includes(secret), false);
  const logged = JSON.stringify(result.logs);
  assert.match(logged, /razorpay_order_creation/);
  assert.match(logged, /authentication_failed/);
  assert.equal(logged.includes(secret), false);
  assert.equal(logged.includes("user_123"), false);
  assert.equal(logged.includes("client_request_123"), false);
});

test("unexpected calculation failures return 500 without leaking exception details", async () => {
  const internalDetails = "database connection included private data";
  const result = await invokeCreateOrder({
    buildOrder: async () => {
      throw new Error(internalDetails);
    },
  });
  assert.equal(result.response.statusCode, 500);
  assert.equal(JSON.stringify(result.response.body).includes(internalDetails), false);
  assert.match(JSON.stringify(result.logs), /order_calculation/);
  assert.equal(result.providerRequests.length, 0);
});
