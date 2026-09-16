const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/response");

const getHealth = asyncHandler(async (req, res) => {
  return successResponse(
    res,
    {
      service: "rajagajak-backend",
      uptime: process.uptime(),
    },
    "Service is healthy",
  );
});

module.exports = { getHealth };
