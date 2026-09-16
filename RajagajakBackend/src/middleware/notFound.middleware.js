const { errorResponse } = require("../utils/response");

const notFound = (req, res) => {
  return errorResponse(
    res,
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
  );
};

module.exports = notFound;
