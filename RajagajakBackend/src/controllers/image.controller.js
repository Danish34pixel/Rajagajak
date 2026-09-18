const asyncHandler = require("../utils/asyncHandler");
const { uploadImage } = require("../services/image.service");
const { successResponse } = require("../utils/response");

const createImage = asyncHandler(async (req, res) => {
  if (!req.files?.length) {
    const error = new Error(
      "At least one image file is required in the 'images' field.",
    );
    error.statusCode = 400;
    throw error;
  }

  try {
    const images = await Promise.all(
      req.files.map((file) =>
        uploadImage({
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        }),
      ),
    );
    return successResponse(res, images, "Images uploaded successfully", 201);
  } catch (error) {
    if (!error.statusCode) error.statusCode = 502;
    error.message = `Image upload failed: ${error.message}`;
    throw error;
  }
});

module.exports = { createImage };
