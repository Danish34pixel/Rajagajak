const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const notifications = require("../controllers/notification.controller");

const router = express.Router();
router.use(authenticate);
router.get("/", notifications.listMyNotifications);
router.patch("/:id/read", notifications.markNotificationRead);

module.exports = router;
