const express = require("express");
const authRoutes = require("./auth.routes");
const healthRoutes = require("./health.routes");
const imageRoutes = require("./image.routes");
const adminRoutes = require("./admin.routes");
const couponRoutes = require("./coupon.routes");
const productRoutes = require("./product.routes");
const orderRoutes = require("./order.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/images", imageRoutes);
router.use("/admin", adminRoutes);
router.use("/coupons", couponRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);

module.exports = router;
