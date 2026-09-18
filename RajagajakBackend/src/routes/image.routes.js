const express = require("express");
const multer = require("multer");
const { createImage } = require("../controllers/image.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requireAdmin } = require("../middleware/admin.middleware");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      const error = new Error("Only image files are allowed.");
      error.statusCode = 400;
      return callback(error);
    }

    return callback(null, true);
  },
});

router.post(
  "/",
  authenticate,
  requireAdmin,
  upload.array("images", 5),
  createImage,
);

module.exports = router;
