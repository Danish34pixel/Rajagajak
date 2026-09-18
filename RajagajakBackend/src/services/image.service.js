const { ImageKit, toFile } = require("@imagekit/nodejs");
const Image = require("../models/image.model");
const env = require("../config/env");

const imageKit = new ImageKit({ privateKey: env.imageKitPrivateKey });

const uploadImage = async ({ buffer, originalName, mimeType, size }) => {
  const file = await toFile(buffer, originalName);
  const uploadedFile = await imageKit.files.upload({
    file,
    fileName: originalName,
    folder: "/rajagajak",
  });

  if (!uploadedFile?.url || !uploadedFile?.fileId) {
    const error = new Error("ImageKit returned an incomplete upload response.");
    error.statusCode = 502;
    throw error;
  }

  return Image.create({
    url: uploadedFile.url,
    fileId: uploadedFile.fileId,
    name: uploadedFile.name || originalName,
    mimeType,
    size,
  });
};

module.exports = { uploadImage };
