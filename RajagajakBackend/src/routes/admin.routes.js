const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");
const products = require("../controllers/product.controller");
const coupons = require("../controllers/coupon.controller");
const orders = require("../controllers/order.controller");
const blog = require("../controllers/blog.controller");
const { createBlogImage } = require("../controllers/blog-image.controller");
const multer = require("multer");

const router = express.Router();
const blogImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) {
      const error = new Error("Only JPEG, PNG, WebP, and GIF images are allowed.");
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

router.use(authenticate, requireAdmin);
router.get("/blog", blog.listAdminArticles);
router.get("/blog/:id", blog.getAdminArticle);
router.post("/blog", blog.createArticle);
router.put("/blog/:id", blog.updateArticle);
router.delete("/blog/:id", blog.deleteArticle);
router.post("/blog/:id/publish", blog.publishArticle);
router.post("/blog/:id/unpublish", blog.unpublishArticle);
router.post("/blog/images", blogImageUpload.single("image"), createBlogImage);
router.get("/products", products.listProducts);
router.post("/products", products.createProduct);
router.get("/products/:id", products.getProduct);
router.put("/products/:id", products.updateProduct);
router.delete("/products/:id", products.deleteProduct);
router.get("/coupons", coupons.listCoupons);
router.get("/coupon-users", coupons.listUsers);
router.post("/coupons", coupons.createCoupon);
router.get("/coupons/:id", coupons.getCoupon);
router.put("/coupons/:id", coupons.updateCoupon);
router.delete("/coupons/:id", coupons.deleteCoupon);
router.get("/orders", orders.listAdminOrders);
router.get("/orders/:id", orders.getAdminOrder);
router.patch("/orders/:id/status", orders.updateOrderStatus);
router.patch("/orders/:id/cancel", orders.cancelAdminOrder);
module.exports = router;
