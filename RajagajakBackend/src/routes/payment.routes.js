const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const {
  createRazorpayOrder,
  getPaymentConfig,
  verifyPayment,
} = require("../controllers/payment.controller");

const router = express.Router();

router.get("/config", getPaymentConfig);
router.use(authenticate);
router.post("/create-order", createRazorpayOrder);
router.post("/verify", verifyPayment);

module.exports = router;
