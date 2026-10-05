const mongoose = require("mongoose");
const OrderStatusNotification = require("../models/OrderStatusNotification.model");
const asyncHandler = require("../utils/asyncHandler");
const { errorResponse, successResponse } = require("../utils/response");

const listMyNotifications = asyncHandler(async (req, res) =>
  successResponse(
    res,
    await OrderStatusNotification.find({
      userId: req.user.sub,
      readAt: null,
    })
      .sort({ createdAt: 1 })
      .limit(20)
      .lean(),
  ),
);

const markNotificationRead = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return errorResponse(res, "Notification not found", 404);
  const notification = await OrderStatusNotification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.sub, readAt: null },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  return notification
    ? successResponse(res, notification)
    : errorResponse(res, "Notification not found", 404);
});

module.exports = { listMyNotifications, markNotificationRead };
