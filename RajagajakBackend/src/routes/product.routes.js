const express = require("express");
const {
  listPublicProducts,
  getPublicProduct,
} = require("../controllers/product.controller");

const router = express.Router();

router.get("/", listPublicProducts);
router.get("/:id", getPublicProduct);

module.exports = router;
