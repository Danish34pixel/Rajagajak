const asyncHandler = require("../utils/asyncHandler");
const { uploadImage } = require("../services/image.service");
const { successResponse } = require("../utils/response");

const createImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    const error = new Error("An image file is required in the 'image' field.");
    error.statusCode = 400;
    throw error;
  }

  const image = await uploadImage({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });

  return successResponse(res, image, "Image uploaded successfully", 201);
});

module.exports = { createImage };
