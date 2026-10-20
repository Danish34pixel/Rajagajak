const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobilePattern = /^[6-9]\d{9}$/;
const pinCodePattern = /^\d{6}$/;

const isValidAddress = (address, { requireLocation = false } = {}) => {
  if (typeof address === "string") return Boolean(address.trim());
  if (!address || typeof address !== "object" || Array.isArray(address)) {
    return false;
  }

  return Boolean(
    String(address.addressLine1 || "").trim() &&
      (!requireLocation ||
        (String(address.city || "").trim() &&
          String(address.state || "").trim())),
  );
};

const validateSignup = ({
  name,
  mobile,
  email,
  address,
  pinCode,
  password,
}) => {
  const errors = [];

  if (!name?.trim()) errors.push("Name is required.");
  if (!mobile || !mobilePattern.test(String(mobile).trim())) {
    errors.push("Mobile must be a valid Indian 10-digit number.");
  }
  if (!email || !emailPattern.test(String(email).trim())) {
    errors.push("A valid email is required.");
  }
  if (!isValidAddress(address, { requireLocation: true })) {
    errors.push("Address line 1, city, and state are required.");
  }
  if (!pinCode || !pinCodePattern.test(String(pinCode).trim())) {
    errors.push("PIN code must be exactly 6 digits.");
  }
  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters.");
  }

  return errors;
};

const validateProfileUpdate = ({ name, mobile, email, address, pinCode }) => {
  const errors = [];

  if (!name?.trim()) errors.push("Name is required.");
  if (!mobile || !mobilePattern.test(String(mobile).trim())) {
    errors.push("Mobile must be a valid Indian 10-digit number.");
  }
  if (!email || !emailPattern.test(String(email).trim())) {
    errors.push("A valid email is required.");
  }
  if (!isValidAddress(address)) errors.push("Address is required.");
  if (!pinCode || !pinCodePattern.test(String(pinCode).trim())) {
    errors.push("PIN code must be exactly 6 digits.");
  }

  return errors;
};

const validateEmail = (email) =>
  typeof email === "string" && emailPattern.test(email.trim());

const validateResetPassword = ({ token, password, confirmPassword }) => {
  const errors = [];
  if (
    typeof token !== "string" ||
    token.length < 32 ||
    token.length > 128 ||
    !/^[A-Za-z0-9_-]+$/.test(token)
  ) {
    errors.push("A valid reset token is required.");
  }
  if (typeof password !== "string" || password.length < 8) {
    errors.push("Password must be at least 8 characters.");
  } else if (Buffer.byteLength(password, "utf8") > 72) {
    errors.push("Password must be no more than 72 bytes.");
  }
  if (typeof confirmPassword !== "string" || password !== confirmPassword) {
    errors.push("Passwords do not match.");
  }
  return errors;
};

module.exports = {
  validateEmail,
  validateProfileUpdate,
  validateResetPassword,
  validateSignup,
};
