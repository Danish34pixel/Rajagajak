const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User.model");
const { errorResponse } = require("../utils/response");

const authenticate = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const token =
    authorization && authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

  if (!token || !env.jwtSecret) {
    return errorResponse(res, "Authentication required", 401);
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).select("+tokenVersion");
    if (!user || (payload.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return errorResponse(res, "Invalid or expired token", 401);
    }
    req.user = payload;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return errorResponse(res, "Invalid or expired token", 401);
    }
    return next(error);
  }
};

module.exports = { authenticate };
