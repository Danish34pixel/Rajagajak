const { createHash, randomBytes } = require("node:crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User.model");
const passwordResetEmail = require("./password-reset-email.service");

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const PASSWORD_HASH_ROUNDS = 12;

const hashResetToken = (token) =>
  createHash("sha256").update(token).digest("hex");

const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) return false;

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  user.resetPasswordTokenHash = tokenHash;
  user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  try {
    await passwordResetEmail.sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      token,
    });
  } catch {
    try {
      await User.updateOne(
        { _id: user._id, resetPasswordTokenHash: tokenHash },
        { $unset: { resetPasswordTokenHash: 1, resetPasswordExpires: 1 } },
      );
    } catch {
      console.error(
        "Password reset email failed and its reset token could not be cleared.",
      );
      return false;
    }
    console.error(
      "Password reset email delivery failed; its reset token was cleared.",
    );
    return false;
  }

  return true;
};

const resetPassword = async (token, password) => {
  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  const now = new Date();
  const user = await User.findOneAndUpdate(
    {
      resetPasswordTokenHash: hashResetToken(token),
      resetPasswordExpires: { $gt: now },
    },
    {
      $set: { password: passwordHash },
      $unset: { resetPasswordTokenHash: 1, resetPasswordExpires: 1 },
      $inc: { tokenVersion: 1 },
    },
    { new: true, runValidators: true },
  );
  return Boolean(user);
};

module.exports = {
  RESET_TOKEN_TTL_MS,
  hashResetToken,
  requestPasswordReset,
  resetPassword,
};
