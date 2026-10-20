const asyncHandler = require("../utils/asyncHandler");
const { errorResponse, successResponse } = require("../utils/response");
const User = require("../models/User.model");
const {
  validateEmail,
  validateProfileUpdate,
  validateResetPassword,
  validateSignup,
} = require("../validators/auth.validator");
const { loginUser, registerUser } = require("../services/auth.service");
const passwordResetService = require("../services/password-reset.service");

const signup = asyncHandler(async (req, res) => {
  const errors = validateSignup(req.body);

  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const user = await registerUser(req.body);
  return successResponse(
    res,
    { user: user.toSafeObject() },
    "User registered successfully",
    201,
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(res, "Email and password are required.", 400);
  }

  const { user, token } = await loginUser(email, password);
  return successResponse(res, { user: user.toSafeObject(), token });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const email = req.body?.email;
  if (!validateEmail(email)) {
    return errorResponse(res, "A valid email address is required.", 400);
  }

  await passwordResetService.requestPasswordReset(email);
  return successResponse(
    res,
    null,
    "If an account exists for that email, reset instructions may be sent. If no message arrives, you can safely request another link.",
  );
});

const resetPassword = asyncHandler(async (req, res) => {
  const errors = validateResetPassword(req.body || {});
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const updated = await passwordResetService.resetPassword(
    req.body.token,
    req.body.password,
  );
  if (!updated) {
    return errorResponse(
      res,
      "This password reset link is invalid or has expired. Request a new one to continue.",
      400,
    );
  }
  return successResponse(res, null, "Password reset successfully.");
});

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user) return errorResponse(res, "User account not found", 404);
  return successResponse(res, { user: user.toSafeObject() });
});

const updateProfile = asyncHandler(async (req, res) => {
  const errors = validateProfileUpdate(req.body);
  if (errors.length > 0) {
    return errorResponse(res, "Validation failed", 400, errors);
  }

  const user = await User.findById(req.user.sub);
  if (!user) return errorResponse(res, "User account not found", 404);

  user.name = req.body.name.trim();
  user.mobile = String(req.body.mobile).trim();
  user.email = req.body.email.trim().toLowerCase();
  user.address =
    typeof req.body.address === "string"
      ? req.body.address.trim()
      : {
          addressLine1: String(req.body.address.addressLine1 || "").trim(),
          addressLine2: String(req.body.address.addressLine2 || "").trim(),
          pincode: String(req.body.pinCode).trim(),
          city: String(req.body.address.city || "").trim(),
          state: String(req.body.address.state || "").trim(),
          country: String(req.body.address.country || "India").trim(),
        };
  user.pinCode = String(req.body.pinCode).trim();

  try {
    await user.save();
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, "A user with this email already exists.", 409);
    }
    throw error;
  }

  return successResponse(res, { user: user.toSafeObject() }, "Profile updated");
});

module.exports = {
  forgotPassword,
  getProfile,
  login,
  resetPassword,
  signup,
  updateProfile,
};
