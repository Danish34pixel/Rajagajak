const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const {
  activeCoupons,
  applyCoupon,
} = require("../controllers/coupon.controller");

const router = express.Router();
router.get("/active", authenticate, activeCoupons);
router.post("/apply", authenticate, applyCoupon);
module.exports = router;
