const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const products = require("../controllers/product.controller");
const coupons = require("../controllers/coupon.controller");

const router = express.Router();
router.use(authenticate, requireAdmin);
router.get("/products", products.listProducts);
router.post("/products", products.createProduct);
router.get("/products/:id", products.getProduct);
router.put("/products/:id", products.updateProduct);
router.delete("/products/:id", products.deleteProduct);
router.get("/coupons", coupons.listCoupons);
router.post("/coupons", coupons.createCoupon);
router.get("/coupons/:id", coupons.getCoupon);
router.put("/coupons/:id", coupons.updateCoupon);
router.delete("/coupons/:id", coupons.deleteCoupon);
module.exports = router;
