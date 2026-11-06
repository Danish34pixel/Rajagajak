const express = require("express");
const {
  createTestOrderRoute,
} = require("../controllers/test-order.controller");

const router = express.Router();
router.post("/create-order", createTestOrderRoute);

module.exports = router;
