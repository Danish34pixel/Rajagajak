const asyncHandler = require("../utils/asyncHandler");
const { errorResponse, successResponse } = require("../utils/response");
const { validateSignup } = require("../validators/auth.validator");
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

module.exports = { signup, login };
