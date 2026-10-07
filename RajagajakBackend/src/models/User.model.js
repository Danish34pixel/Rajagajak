const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      match: /^[6-9]\d{9}$/,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    address: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator: (value) =>
          (typeof value === "string" && Boolean(value.trim())) ||
          (value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            Boolean(String(value.addressLine1 || "").trim())),
        message: "Address is required.",
      },
    },
    pinCode: {
      type: String,
      required: true,
      match: /^\d{6}$/,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      set: (value) => String(value).toLowerCase(),
    },
  },
  { timestamps: true },
);

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    name: this.name,
    mobile: this.mobile,
    email: this.email,
    address:
      this.address && typeof this.address === "object"
        ? { ...this.address }
        : this.address,
    pinCode: this.pinCode,
    role: this.role || "user",
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
