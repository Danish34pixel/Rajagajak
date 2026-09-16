const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.model");
const env = require("../config/env");

const createToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), role: user.role || "user" },
    env.jwtSecret,
    { expiresIn: "7d" },
  );

const registerUser = async ({
  name,
  mobile,
  email,
  address,
  pinCode,
  password,
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    const error = new Error("A user with this email already exists.");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const userData = {
    name: name.trim(),
    mobile: String(mobile).trim(),
    email: normalizedEmail,
    address: address.trim(),
    pinCode: String(pinCode).trim(),
    password: hashedPassword,
    role: "user",
  };

  try {
    return await User.create(userData);
  } catch (error) {
    if (error.code === 11000) {
      const duplicateError = new Error(
        "A user with this email already exists.",
      );
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    "+password",
  );

  if (!user || !(await bcrypt.compare(password, user.password))) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  return { user, token: createToken(user) };
};

module.exports = { registerUser, loginUser };
