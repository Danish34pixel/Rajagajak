const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { errorResponse } = require("../utils/response");

const authenticate = (req, res, next) => {
  const authorization = req.headers.authorization;
  const token =
    authorization && authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

  if (!token || !env.jwtSecret) {
    return errorResponse(res, "Authentication required", 401);
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    return next();
  } catch (error) {
    return errorResponse(res, "Invalid or expired token", 401);
  }
};

module.exports = { authenticate };
