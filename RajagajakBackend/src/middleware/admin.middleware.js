const User = require("../models/User.model");
const { errorResponse } = require("../utils/response");

const requireAdmin = async (req, res, next) => {
  const user = await User.findById(req.user.sub).select("role");
  if (!user || String(user.role).toLowerCase() !== "admin") {
    return errorResponse(res, "Admin access required", 403);
  }
  req.userRecord = user;
  return next();
};

module.exports = { requireAdmin };
