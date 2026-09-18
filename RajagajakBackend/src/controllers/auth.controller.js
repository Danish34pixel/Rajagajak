const asyncHandler = require("../utils/asyncHandler");
const { errorResponse, successResponse } = require("../utils/response");
const User = require("../models/User.model");
const {
  validateProfileUpdate,
  validateSignup,
} = require("../validators/auth.validator");
const { loginUser, registerUser } = require("../services/auth.service");

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
  user.address = req.body.address.trim();
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

module.exports = { getProfile, login, signup, updateProfile };
