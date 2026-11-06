const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");
const { errorResponse, successResponse } = require("../utils/response");
const { createTestOrder } = require("../services/test-order.service");

const isLoopback = (address = "") =>
  ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address);

const createTestOrderRoute = asyncHandler(async (req, res) => {
  if (env.nodeEnv === "production") {
    return errorResponse(res, "Not found", 404);
  }
  if (!isLoopback(req.socket.remoteAddress)) {
    return errorResponse(
      res,
      "Test orders are only allowed from localhost.",
      403,
    );
  }

  const { order, notification } = await createTestOrder();
  void notification;
  return successResponse(
    res,
    { id: order._id, orderNumber: order.orderNumber },
    "Development test order created",
    201,
  );
});

module.exports = { createTestOrderRoute };
