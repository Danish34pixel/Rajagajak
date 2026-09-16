const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mobilePattern = /^[6-9]\d{9}$/;
const pinCodePattern = /^\d{6}$/;

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
  if (!address?.trim()) errors.push("Address is required.");
  if (!pinCode || !pinCodePattern.test(String(pinCode).trim())) {
    errors.push("PIN code must be exactly 6 digits.");
  }
  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters.");
  }

  return errors;
};

module.exports = { validateSignup };
