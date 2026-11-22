const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const env = require("../config/env");
const { normalizeIndianMobile } = require("../validators/auth.validator");

const createToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role || "user",
      tokenVersion: user.tokenVersion || 0,
    },
    env.jwtSecret,
    { expiresIn: "7d" },
  );

const registerUser = async ({
  name,
  mobile,
  email,
  registrationMethod = "email",
  address,
  pinCode,
  password,
}) => {
  const normalizedEmail = email?.trim().toLowerCase() || undefined;
  const normalizedMobile = mobile
    ? normalizeIndianMobile(String(mobile))
    : undefined;

  if (
    (registrationMethod === "email" && !normalizedEmail) ||
    (registrationMethod === "mobile" && !normalizedMobile)
  ) {
    const error = new Error("A valid registration identifier is required.");
    error.statusCode = 400;
    throw error;
  }
  if (mobile && !normalizedMobile) {
    const error = new Error("Mobile must be a valid Indian 10-digit number.");
    error.statusCode = 400;
    throw error;
  }

  const identifiers = [];
  if (normalizedEmail) identifiers.push({ email: normalizedEmail });
  if (normalizedMobile) identifiers.push({ mobile: normalizedMobile });
  const existingUser = await User.findOne({ $or: identifiers });

  if (existingUser) {
    const error = new Error(
      "An account with this email or mobile number already exists.",
    );
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const normalizedAddress =
    typeof address === "string"
      ? address.trim()
      : {
          addressLine1: String(address.addressLine1 || "").trim(),
          addressLine2: String(address.addressLine2 || "").trim(),
          pincode: String(pinCode).trim(),
          city: String(address.city || "").trim(),
          state: String(address.state || "").trim(),
          country: String(address.country || "India").trim(),
        };
  const userData = {
    name: name.trim(),
    mobile: normalizedMobile,
    email: normalizedEmail,
    address: normalizedAddress,
    pinCode: String(pinCode).trim(),
    password: hashedPassword,
    role: "user",
  };

  try {
    return await User.create(userData);
  } catch (error) {
    if (error.code === 11000) {
      const duplicateError = new Error(
        "An account with this email or mobile number already exists.",
      );
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
};

const loginUser = async (identifier, password, method = "email") => {
  const query =
    method === "mobile"
      ? { mobile: normalizeIndianMobile(identifier) }
      : { email: identifier.trim().toLowerCase() };
  const user = await User.findOne(query).select("+password +tokenVersion");

  if (!user || !(await bcrypt.compare(password, user.password))) {
    const error = new Error("Invalid email/mobile number or password.");
    error.statusCode = 401;
    throw error;
  }

  return { user, token: createToken(user) };
};

module.exports = { createToken, registerUser, loginUser };
