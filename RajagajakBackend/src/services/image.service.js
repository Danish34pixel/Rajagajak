const { ImageKit, toFile } = require("@imagekit/nodejs");
const Image = require("../models/image.model");
const env = require("../config/env");

const imageKit = new ImageKit({ privateKey: env.imageKitPrivateKey });

const uploadImage = async ({ buffer, originalName, mimeType, size }) => {
  const file = await toFile(buffer, originalName);
  const uploadedFile = await imageKit.beta.v2.files.upload({
    file,
    fileName: originalName,
    folder: "/rajagajak",
  });

  return Image.create({
    url: uploadedFile.url,
    fileId: uploadedFile.fileId,
    name: uploadedFile.name || originalName,
    mimeType,
    size,
  });
};

module.exports = { uploadImage };
