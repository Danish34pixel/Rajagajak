const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const orders = require("../controllers/order.controller");

const router = express.Router();
router.use(authenticate);
router.post("/quote", orders.quoteOrder);
router.post("/", orders.createOrder);
router.get("/my-orders", orders.listMyOrders);
router.get("/:id", orders.getMyOrder);
router.patch("/:id/cancel", orders.cancelOrder);

module.exports = router;
