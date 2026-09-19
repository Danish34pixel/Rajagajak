const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    bulletPoints: { type: [String], default: [] },
    images: {
      type: [String],
      default: [],
      validate: [
        (images) => images.length <= 5,
        "A product can have at most 5 images.",
      ],
    },
    image: { type: String, trim: true },
    mrp: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, max: 100 },
    finalPrice: { type: Number, required: true, min: 0 },
    gstPercentage: { type: Number, default: 0, min: 0, max: 100 },
    stock: { type: Number, default: 0, min: 0 },
    category: { type: String, default: "", trim: true, maxlength: 80 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", productSchema);
