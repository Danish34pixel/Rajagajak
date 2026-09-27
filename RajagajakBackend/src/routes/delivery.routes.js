const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const orders = require("../controllers/order.controller");

const router = express.Router();
router.post("/calculate", authenticate, orders.quoteShipping);

module.exports = router;
