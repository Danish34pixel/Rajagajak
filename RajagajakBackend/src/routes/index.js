const express = require("express");
const authRoutes = require("./auth.routes");
const healthRoutes = require("./health.routes");
const imageRoutes = require("./image.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/images", imageRoutes);

module.exports = router;
