const express = require("express");
const {
  activeCoupons,
  applyCoupon,
} = require("../controllers/coupon.controller");

const router = express.Router();
router.get("/active", activeCoupons);
router.post("/apply", applyCoupon);
module.exports = router;
