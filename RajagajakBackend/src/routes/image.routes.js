const express = require("express");
const multer = require("multer");
const { createImage } = require("../controllers/image.controller");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      return callback(new Error("Only image files are allowed."));
    }

    return callback(null, true);
  },
});

router.post("/", upload.single("image"), createImage);

module.exports = router;
