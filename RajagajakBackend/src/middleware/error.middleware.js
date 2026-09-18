const env = require("../config/env");
const { errorResponse } = require("../utils/response");

const errorHandler = (error, req, res, next) => {
  const statusCode =
    error.statusCode || (error.name === "MulterError" ? 400 : 500);
  const message =
    statusCode === 500 && env.nodeEnv === "production"
      ? "Internal server error"
      : error.message || "Internal server error";

  const details = env.nodeEnv === "production" ? null : error.name || null;
  return errorResponse(res, message, statusCode, details);
};

module.exports = errorHandler;
