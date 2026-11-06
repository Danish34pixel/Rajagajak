const test = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");
const env = require("../src/config/env");
const {
  sendAdminOrderEmail,
} = require("../src/services/admin-order-email.service");

test("admin order email sends the saved order details to the configured admin", async () => {
  const originalCreateTransport = nodemailer.createTransport;
  const originalEnv = {
    adminNotificationEmail: env.adminNotificationEmail,
    smtpHost: env.smtpHost,
    smtpPort: env.smtpPort,
    smtpPortConfigured: env.smtpPortConfigured,
    smtpSecure: env.smtpSecure,
    smtpUser: env.smtpUser,
    smtpPass: env.smtpPass,
    emailFrom: env.emailFrom,
    frontendUrl: env.frontendUrl,
  };
  let transportOptions;
  let message;

  Object.assign(env, {
    adminNotificationEmail: "rajagajak27@gmail.com",
    smtpHost: "smtp.example.com",
    smtpPort: 587,
    smtpPortConfigured: true,
    smtpSecure: false,
    smtpUser: "smtp-user",
    smtpPass: "smtp-password",
    emailFrom: "Raja Gajak <orders@example.com>",
    frontendUrl: "https://rajagajak.example",
  });
  nodemailer.createTransport = (options) => {
    transportOptions = options;
    return {
      sendMail: async (mail) => {
        message = mail;
      },
    };
  };

  try {
    await sendAdminOrderEmail({
      _id: "order-id-123",
      orderNumber: "RJG-20261106-AB12CD34",
      createdAt: new Date("2026-11-06T10:00:00.000Z"),
      userId: {
        name: "Customer",
        mobile: "9876543210",
        email: "customer@example.com",
      },
      shippingAddress: {
        name: "Customer",
        mobile: "9876543210",
        fullAddress: "12 Market Road, Bhopal",
      },
      items: [
        {
          productName: "Gajak <special>",
          quantityKg: 0.5,
          pricePerKg: 400,
          itemTotal: 200,
        },
      ],
      pricing: {
        subtotal: 250,
        discount: 50,
        couponDiscount: 10,
        shippingDiscount: 5,
        shippingCharges: 25,
        grandTotal: 210,
      },
      paymentMethod: "razorpay",
      paymentStatus: "paid",
    });

    assert.equal(transportOptions.host, "smtp.example.com");
    assert.equal(message.to, "rajagajak27@gmail.com");
    assert.equal(
      message.subject,
      "New Order Received - #RJG-20261106-AB12CD34",
    );
    assert.match(message.html, /Gajak &lt;special&gt;/);
    assert.match(message.html, /customer@example\.com/);
    assert.match(message.html, /250/);
    assert.match(message.html, /210/);
    assert.match(
      message.html,
      /https:\/\/rajagajak\.example\/admin\/orders\/order-id-123/,
    );
    assert.match(message.text, /Online \(Razorpay\) - PAID/);
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    Object.assign(env, originalEnv);
  }
});
