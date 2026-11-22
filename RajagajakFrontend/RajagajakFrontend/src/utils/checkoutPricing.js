export const calculateCheckoutGrandTotal = ({
  taxableAmount = 0,
  couponDiscount = 0,
  gstAmount = 0,
  shippingCharge = 0,
}) => {
  const total =
    Number(taxableAmount || 0) -
    Number(couponDiscount || 0) +
    Number(gstAmount || 0) +
    Number(shippingCharge || 0);
  return Number(Math.max(0, total).toFixed(2));
};

export const getCartTotalWeightKg = (cartItems = []) =>
  Number(
    (cartItems || [])
      .reduce((total, item) => total + Number(item.quantityKg || 0), 0)
      .toFixed(3),
  );

export const isMinimumCartWeightMet = (cartItems = []) =>
  getCartTotalWeightKg(cartItems) >= 1;
