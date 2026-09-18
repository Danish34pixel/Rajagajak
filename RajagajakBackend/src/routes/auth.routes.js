const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const {
  getProfile,
  login,
  signup,
  updateProfile,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/profile", authenticate, getProfile);
router.patch("/profile", authenticate, updateProfile);

module.exports = router;
