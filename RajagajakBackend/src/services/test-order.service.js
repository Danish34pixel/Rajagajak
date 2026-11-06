const crypto = require("node:crypto");
const env = require("../config/env");
const User = require("../models/User.model");
const Product = require("../models/Product.model");
const { saveOrder, notifyAdminOrder } = require("./order-placement.service");

const createTestOrder = async () => {
  if (env.nodeEnv === "production") {
    throw new Error("Test orders are disabled in production.");
  }

  const user = process.env.TEST_ORDER_USER_ID
    ? await User.findById(process.env.TEST_ORDER_USER_ID).select("_id")
    : await User.findOne().select("_id");
  if (!user) {
    throw new Error(
      "No existing user found. Set TEST_ORDER_USER_ID to a valid user ID.",
    );
  }

  const productId = "6ad0a323d91957bcd48cdc34";
  let product = await Product.findById(productId).select("_id");
  if (!product) {
    product = await Product.findOne({ title: /Shahi.*Gajak/i }).select("_id");
    if (product) {
      console.warn(
        `Test product ${productId} is absent; using existing Shahi Gajak product ${product._id}.`,
      );
    }
  }
  if (!product) {
    throw new Error(
      "No existing Shahi Gajak product was found in this database.",
    );
  }

  const requestId = crypto.randomUUID();
  const orderNumber = `RJG-TEST-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${requestId.slice(0, 8).toUpperCase()}`;
  const latitude = 23.2806977;
  const longitude = 77.4008876;
  const address =
    "Sant Kanwar Ram Colony, Bhopal, Huzur Tahsil, Madhya Pradesh - 462001, India";

  const order = await saveOrder({
    orderNumber,
    clientRequestId: requestId,
    userId: user._id,
    items: [
      {
        productId: product._id,
        productName: "Shahi gajak",
        category: "Gajak & Sweets",
        image:
          "https://ik.imagekit.io/0e9u63rqus/rajagajak/Generated_Image_October_10__2026_-_1_05PM_qUJkVpUvf.jpg",
        quantityKg: 1,
        pricePerKg: 56.05,
        mrpPerKg: 59,
        discountPercentage: 0,
        discountAmount: 0,
        couponDiscount: 0,
        gstPercentage: 5.2631578947,
        gstAmount: 2.95,
        taxableAmount: 56.05,
        itemTotal: 59,
      },
    ],
    shippingAddress: {
      name: "qq",
      mobile: "8770683941",
      address,
      fullAddress: address,
      area: "Sant Kanwar Ram Colony",
      city: "Bhopal",
      state: "Madhya Pradesh",
      pincode: "462001",
      country: "India",
      locationDetected: true,
      locationSource: "gps",
      latitude,
      longitude,
    },
    shipping: {
      distanceKm: 2.793,
      shippingCharge: 50,
      shippingMethod: "local",
      shippingZone: "local",
      estimated: false,
      shipmentWeightKg: 1,
      chargeableWeightKg: 1,
      distanceMethod: "haversine",
      geocodingPrecision: "gps",
      destination: { latitude, longitude },
      location: {
        fullAddress: address,
        area: "Sant Kanwar Ram Colony",
        city: "Bhopal",
        state: "Madhya Pradesh",
        pincode: "462001",
        country: "India",
      },
    },
    pricing: {
      subtotal: 59,
      discount: 0,
      taxableAmount: 56.05,
      totalGST: 2.95,
      shippingCharges: 50,
      couponDiscount: 0,
      shippingDiscount: 0,
      grandTotal: 52.95,
    },
    paymentMethod: "razorpay",
    paymentStatus: "paid",
    paymentId: "pay_TEST123456",
    razorpayPaymentId: "pay_TEST123456",
    razorpayOrderId: "order_TEST123456",
    razorpaySignature: "test_signature",
    orderStatus: "received",
  });

  console.log(`Order saved: ${order.orderNumber}`);
  const notification = notifyAdminOrder(order);
  return { order, notification };
};

module.exports = { createTestOrder };
