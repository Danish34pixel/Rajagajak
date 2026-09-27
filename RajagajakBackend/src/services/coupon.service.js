const round = (value) => Number(value.toFixed(2));

const COUPON_TYPES = [
  "percentage",
  "fixed",
  "free_shipping",
  "fixed_shipping",
  "buy_x_get_y",
  "buy_x_get_percentage",
  "buy_x_get_fixed",
];

const COUPON_ERRORS = {
  INVALID: "Coupon is invalid.",
  INACTIVE: "Coupon is currently unavailable.",
  UPCOMING: "Coupon is not active yet.",
  EXPIRED: "Coupon has expired.",
  DAY: "Coupon is not valid today.",
  USAGE: "Coupon usage limit reached.",
  USER_LIMIT: "You have already used this coupon the maximum number of times.",
  FIRST_ORDER: "This coupon is only valid for new users.",
  RETURNING: "This coupon is only valid for returning customers.",
  USER: "This coupon is not available for your account.",
  PRODUCT: "Coupon is not valid for this product.",
  CATEGORY: "Coupon is not valid for this category.",
  MINIMUM: (amount) => `Minimum order value of ₹${amount} required.`,
  QUANTITY: (amount) => `Minimum quantity of ${amount} KG required.`,
  CITY: "This coupon is not valid for this city.",
  PINCODE: "This coupon is not valid for this pincode.",
  RADIUS: "This coupon is not valid for this delivery area.",
  PAYMENT: "This coupon is not valid for the selected payment method.",
  UNSUPPORTED: "This campaign eligibility is not available yet.",
};

const getCouponType = (coupon) =>
  coupon.type || coupon.discountType || "percentage";

const calculateGetBenefit = (items, coupon, type) => {
  const buyQuantity = Number(coupon.buyQuantity);
  const getQuantity = Number(coupon.getQuantity);
  const quantity = items.reduce((sum, item) => sum + item.quantityKg, 0);
  if (
    !Number.isFinite(buyQuantity) ||
    buyQuantity <= 0 ||
    !Number.isFinite(getQuantity) ||
    getQuantity <= 0
  )
    throw new Error("Coupon buy/get quantities are invalid.");

  const cycles = Math.floor(quantity / (buyQuantity + getQuantity));
  const benefitQuantity = Math.min(cycles * getQuantity, quantity);
  if (benefitQuantity <= 0)
    throw new Error(COUPON_ERRORS.QUANTITY(buyQuantity + getQuantity));

  let remainingQuantity = benefitQuantity;
  let discount = 0;
  const adjustments = new Map();
  const cheapestFirst = [...items].sort(
    (left, right) => left.pricePerKg - right.pricePerKg,
  );
  for (const item of cheapestFirst) {
    if (remainingQuantity <= 0) break;
    const quantityToDiscount = Math.min(item.quantityKg, remainingQuantity);
    const itemAmount = round(
      item.taxableAmount * (quantityToDiscount / item.quantityKg),
    );
    const itemDiscount =
      type === "buy_x_get_y"
        ? itemAmount
        : type === "buy_x_get_percentage"
          ? (itemAmount * Number(coupon.getDiscountPercentage)) / 100
          : Number(coupon.getDiscountAmount) * cycles;
    adjustments.set(item, Math.min(itemAmount, round(itemDiscount)));
    discount += adjustments.get(item);
    remainingQuantity -= quantityToDiscount;
  }
  if (type === "buy_x_get_percentage") {
    const max =
      coupon.maximumDiscount == null
        ? Infinity
        : Number(coupon.maximumDiscount);
    discount = Math.min(discount, max);
  }
  if (type === "buy_x_get_fixed") {
    discount = Math.min(discount, Number(coupon.getDiscountAmount) * cycles);
  }
  const cap = Math.min(
    discount,
    items.reduce((sum, item) => sum + item.taxableAmount, 0),
  );
  if (cap < discount) discount = cap;
  if (
    discount > 0 &&
    [...adjustments.values()].reduce((sum, amount) => sum + amount, 0) >
      discount
  ) {
    let toRemove =
      [...adjustments.values()].reduce((sum, amount) => sum + amount, 0) -
      discount;
    for (const item of [...adjustments.keys()].reverse()) {
      const amount = adjustments.get(item);
      const reduction = Math.min(amount, toRemove);
      adjustments.set(item, round(amount - reduction));
      toRemove -= reduction;
      if (toRemove <= 0) break;
    }
  }
  return { discount: round(discount), adjustments };
};

const evaluateCoupon = ({
  coupon,
  items,
  shipping,
  shippingAddress = {},
  paymentMethod = "cod",
  now = new Date(),
  userOrderCount = 0,
  userCouponUseCount = 0,
  userId,
}) => {
  const type = getCouponType(coupon);
  if (!COUPON_TYPES.includes(type)) throw new Error(COUPON_ERRORS.INVALID);
  if (!coupon.isActive) throw new Error(COUPON_ERRORS.INACTIVE);
  if (now < coupon.startDate) throw new Error(COUPON_ERRORS.UPCOMING);
  if (now > coupon.expiryDate) throw new Error(COUPON_ERRORS.EXPIRED);
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit)
    throw new Error(COUPON_ERRORS.USAGE);
  if (coupon.perUserLimit != null && userCouponUseCount >= coupon.perUserLimit)
    throw new Error(COUPON_ERRORS.USER_LIMIT);
  if (coupon.eligibilityType === "first_order" && userOrderCount > 0)
    throw new Error(COUPON_ERRORS.FIRST_ORDER);
  if (coupon.eligibilityType === "returning" && userOrderCount === 0)
    throw new Error(COUPON_ERRORS.RETURNING);
  if (
    [
      "referral",
      "cart_abandonment",
      "reorder",
      "loyalty",
      "birthday",
      "review_reward",
    ].includes(coupon.eligibilityType)
  )
    throw new Error(COUPON_ERRORS.UNSUPPORTED);
  if (
    (coupon.eligibilityType === "specific_users" ||
      coupon.eligibleUsers?.length) &&
    !coupon.eligibleUsers?.some(
      (eligibleUser) => String(eligibleUser) === String(userId),
    )
  )
    throw new Error(COUPON_ERRORS.USER);

  const today = now.getDay();
  if (coupon.allowedDays?.length && !coupon.allowedDays.includes(today))
    throw new Error(COUPON_ERRORS.DAY);
  if (
    coupon.paymentMethods?.length &&
    !coupon.paymentMethods.includes(paymentMethod)
  )
    throw new Error(COUPON_ERRORS.PAYMENT);
  const verifiedLocation = shipping?.location || {};
  if (
    coupon.cities?.length &&
    !coupon.cities.some(
      (city) =>
        city.toLowerCase() ===
        String(verifiedLocation.city || "")
          .trim()
          .toLowerCase(),
    )
  )
    throw new Error(COUPON_ERRORS.CITY);
  if (
    coupon.pincodes?.length &&
    !coupon.pincodes.includes(String(verifiedLocation.pincode || "").trim())
  )
    throw new Error(COUPON_ERRORS.PINCODE);
  if (
    coupon.radiusKm != null &&
    (!shipping || shipping.distanceKm > coupon.radiusKm)
  )
    throw new Error(COUPON_ERRORS.RADIUS);

  const eligibleItems = items.filter((item) => {
    const productAllowed =
      !coupon.applicableProducts?.length ||
      coupon.applicableProducts.some(
        (id) => String(id) === String(item.productId),
      );
    const categoryAllowed =
      !coupon.applicableCategories?.length ||
      coupon.applicableCategories.some(
        (category) =>
          category.toLowerCase() === String(item.category || "").toLowerCase(),
      );
    return productAllowed && categoryAllowed;
  });
  if (!eligibleItems.length) {
    if (coupon.applicableCategories?.length)
      throw new Error(COUPON_ERRORS.CATEGORY);
    throw new Error(COUPON_ERRORS.PRODUCT);
  }

  const eligibleAmount = round(
    eligibleItems.reduce((sum, item) => sum + item.taxableAmount, 0),
  );
  const eligibleQuantity = eligibleItems.reduce(
    (sum, item) => sum + item.quantityKg,
    0,
  );
  if (eligibleAmount < Number(coupon.minimumOrderValue || 0))
    throw new Error(COUPON_ERRORS.MINIMUM(coupon.minimumOrderValue));
  if (eligibleQuantity < Number(coupon.minimumQuantity || 0))
    throw new Error(COUPON_ERRORS.QUANTITY(coupon.minimumQuantity));

  let discount = 0;
  let itemAdjustments = new Map();
  let shippingDiscount = 0;
  if (type === "percentage" || type === "fixed") {
    discount =
      type === "percentage"
        ? (eligibleAmount * Number(coupon.discountValue)) / 100
        : Number(coupon.discountValue);
    if (coupon.maximumDiscount != null)
      discount = Math.min(discount, Number(coupon.maximumDiscount));
    discount = Math.min(round(discount), eligibleAmount);
    let unassigned = discount;
    eligibleItems.forEach((item, index) => {
      const itemDiscount =
        index === eligibleItems.length - 1
          ? unassigned
          : round((discount * item.taxableAmount) / eligibleAmount);
      itemAdjustments.set(item, Math.min(item.taxableAmount, itemDiscount));
      unassigned = round(unassigned - itemDiscount);
    });
  } else if (type === "free_shipping") {
    shippingDiscount = Number(shipping?.shippingCharge || 0);
  } else if (type === "fixed_shipping") {
    const fixedShipping = Number(coupon.discountValue);
    const finalShipping = Math.min(
      Number(shipping?.shippingCharge || 0),
      fixedShipping,
    );
    shippingDiscount = round(
      Number(shipping?.shippingCharge || 0) - finalShipping,
    );
  } else {
    const result = calculateGetBenefit(eligibleItems, coupon, type);
    discount = result.discount;
    itemAdjustments = result.adjustments;
  }

  const updatedItems = items.map((item) => {
    const couponDiscount = itemAdjustments.get(item) || 0;
    const taxableAmount = round(
      Math.max(0, item.taxableAmount - couponDiscount),
    );
    const gstAmount = round(
      (taxableAmount * Number(item.gstPercentage || 0)) / 100,
    );
    return {
      ...item,
      couponDiscount,
      taxableAmount,
      gstAmount,
      itemTotal: round(taxableAmount + gstAmount),
    };
  });
  const baseShipping = Number(shipping?.shippingCharge || 0);
  const finalShipping = round(Math.max(0, baseShipping - shippingDiscount));
  const taxableAmount = round(
    updatedItems.reduce((sum, item) => sum + item.taxableAmount, 0),
  );
  const totalGST = round(
    updatedItems.reduce((sum, item) => sum + item.gstAmount, 0),
  );
  const subtotal = round(
    items.reduce((sum, item) => sum + item.mrpPerKg * item.quantityKg, 0),
  );
  const productDiscount = round(
    items.reduce((sum, item) => sum + item.discountAmount, 0),
  );
  const grandTotal = round(taxableAmount + totalGST + finalShipping);

  return {
    coupon: {
      id: coupon._id,
      code: coupon.code,
      title: coupon.title,
      type,
      campaignName: coupon.campaignName || "",
    },
    discount: round(discount),
    shippingDiscount: round(shippingDiscount),
    originalShipping: round(baseShipping),
    finalShipping,
    items: updatedItems,
    pricing: {
      subtotal,
      discount: productDiscount,
      couponDiscount: round(discount),
      taxableAmount,
      totalGST,
      shippingCharges: finalShipping,
      shippingDiscount: round(shippingDiscount),
      grandTotal,
    },
    message: "Coupon applied successfully",
  };
};

module.exports = { COUPON_ERRORS, COUPON_TYPES, evaluateCoupon };
