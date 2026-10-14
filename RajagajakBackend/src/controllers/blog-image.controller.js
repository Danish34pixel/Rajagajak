const asyncHandler = require("../utils/asyncHandler");
const { uploadImage } = require("../services/image.service");
const { successResponse } = require("../utils/response");

const hasSupportedImageSignature = (buffer, mimeType) => {
  if (!Buffer.isBuffer(buffer)) return false;
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }
  if (mimeType === "image/png") {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }
  if (mimeType === "image/gif") {
    const signature = buffer.toString("ascii", 0, 6);
    return signature === "GIF87a" || signature === "GIF89a";
  }
  return false;
};

const createBlogImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    const error = new Error("An image file is required in the 'image' field.");
    error.statusCode = 400;
    throw error;
  }
  if (!hasSupportedImageSignature(req.file.buffer, req.file.mimetype)) {
    const error = new Error("The uploaded file is not a valid supported image.");
    error.statusCode = 400;
    throw error;
  }

  try {
    const image = await uploadImage({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
    return successResponse(
      res,
      { url: image.url },
      "Image uploaded successfully",
      201,
    );
  } catch (error) {
    if (!error.statusCode) error.statusCode = 502;
    error.message = `Image upload failed: ${error.message}`;
    throw error;
  }
});

module.exports = { createBlogImage, hasSupportedImageSignature };
