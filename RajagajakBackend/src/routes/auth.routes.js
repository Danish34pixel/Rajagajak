const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const {
  forgotPassword,
  getProfile,
  login,
  resetPassword,
  signup,
  updateProfile,
} = require("../controllers/auth.controller");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset requests. Please try again later.",
    error: null,
  },
});
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again later.",
    error: null,
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
    error: null,
  },
});

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", passwordChangeLimiter, resetPassword);
router.get("/profile", authenticate, getProfile);
router.patch("/profile", authenticate, updateProfile);

module.exports = router;
