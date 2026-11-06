const nodemailer = require("nodemailer");
const env = require("../config/env");

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value) || 0);

const getAdminEmailConfigStatus = () => ({
  SMTP_HOST: Boolean(env.smtpHost),
  SMTP_PORT:
    env.smtpPortConfigured &&
    Number.isInteger(env.smtpPort) &&
    env.smtpPort > 0,
  SMTP_USER: Boolean(env.smtpUser),
  SMTP_PASS: Boolean(env.smtpPass),
  ADMIN_NOTIFICATION_EMAIL: Boolean(env.adminNotificationEmail),
  EMAIL_FROM: Boolean(env.emailFrom),
});

const getMissingAdminEmailConfig = () =>
  Object.entries(getAdminEmailConfigStatus())
    .filter(([, isConfigured]) => !isConfigured)
    .map(([name]) => name);

const createAdminOrderTransporter = () =>
  nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });

const verifyAdminOrderEmailTransport = async () => {
  const configStatus = getAdminEmailConfigStatus();
  console.log(
    "[admin-order-email] Environment variables configured:",
    JSON.stringify(configStatus),
  );

  const missingConfiguration = getMissingAdminEmailConfig();
  if (missingConfiguration.length > 0) {
    console.error(
      `[admin-order-email] Startup SMTP verification skipped; unset variables: ${missingConfiguration.join(", ")}`,
    );
    return false;
  }

  try {
    await createAdminOrderTransporter().verify();
    console.log("[admin-order-email] Startup transporter.verify() succeeded");
    return true;
  } catch (error) {
    console.error(
      `[admin-order-email] Startup transporter.verify() failed: ${error.stack || error.message}`,
    );
    return false;
  }
};

const getAddress = (address = {}) =>
  address.fullAddress ||
  [
    address.building,
    address.houseNumber,
    address.road,
    address.locality,
    address.address,
    address.area,
    address.city,
    address.district,
    [address.state, address.pincode].filter(Boolean).join(" "),
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

const getAdminOrderLink = (order) => {
  if (!env.frontendUrl || !order._id) return "";
  try {
    return new URL(
      `/admin/orders/${encodeURIComponent(String(order._id))}`,
      env.frontendUrl,
    ).toString();
  } catch {
    return "";
  }
};

const buildAdminOrderEmail = (order) => {
  const orderId = order.orderNumber || String(order._id || "Unknown");
  const createdAt = new Date(order.createdAt || Date.now()).toLocaleString(
    "en-IN",
    { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" },
  );
  const customer =
    order.userId && typeof order.userId === "object" ? order.userId : {};
  const address = order.shippingAddress || {};
  const items = (order.items || []).map((item) => {
    const quantity = `${Number(item.quantityKg || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 3,
    })} kg`;
    return {
      name: item.productName || "Product",
      quantity,
      price: `${formatPrice(item.pricePerKg)} / kg`,
      total: formatPrice(item.itemTotal),
    };
  });
  const pricing = order.pricing || {};
  const paymentMethod =
    order.paymentMethod === "cod" ? "COD" : "Online (Razorpay)";
  const paymentStatus = String(order.paymentStatus || "pending").toUpperCase();
  const orderLink = getAdminOrderLink(order);
  const safe = escapeHtml;

  const itemRows = items
    .map(
      (item) => `<tr>
        <td style="padding:12px;border-bottom:1px solid #e6e9e4;">${safe(item.name)}</td>
        <td style="padding:12px;border-bottom:1px solid #e6e9e4;">${safe(item.quantity)}</td>
        <td style="padding:12px;border-bottom:1px solid #e6e9e4;">${safe(item.price)}</td>
        <td style="padding:12px;border-bottom:1px solid #e6e9e4;text-align:right;">${safe(item.total)}</td>
      </tr>`,
    )
    .join("");

  const discountRows = [
    ["Discount", pricing.discount],
    ["Coupon discount", pricing.couponDiscount],
    ["Delivery discount", pricing.shippingDiscount],
  ]
    .filter(([, value]) => Number(value) > 0)
    .map(
      ([label, value]) => `<tr>
        <td style="padding:6px 0;color:#53645a;">${safe(label)}</td>
        <td style="padding:6px 0;text-align:right;">-${safe(formatPrice(value))}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px 12px;background:#f4f6f1;font-family:Arial,Helvetica,sans-serif;color:#26352b;">
    <table role="presentation" style="width:100%;max-width:720px;margin:0 auto;background:#fff;border-collapse:collapse;">
      <tr><td style="padding:24px 28px;background:#174b35;color:#fff;">
        <p style="margin:0;color:#d4dc8a;font-size:12px;text-transform:uppercase;">Raja Gajak · New order</p>
        <h1 style="margin:8px 0 0;font-size:24px;">Order #${safe(orderId)}</h1>
        <p style="margin:8px 0 0;color:#e5ece5;">${safe(createdAt)}</p>
      </td></tr>
      <tr><td style="padding:24px 28px;">
        <h2 style="margin:0 0 12px;font-size:17px;">Customer details</h2>
        <p style="margin:0;line-height:1.7;">
          <strong>Name:</strong> ${safe(address.name || customer.name)}<br>
          <strong>Phone:</strong> ${safe(address.mobile || customer.mobile)}<br>
          <strong>Email:</strong> ${safe(customer.email)}<br>
          <strong>Delivery address:</strong> ${safe(getAddress(address))}
        </p>
      </td></tr>
      <tr><td style="padding:0 28px 20px;">
        <h2 style="margin:0 0 12px;font-size:17px;">Ordered items</h2>
        <table style="width:100%;border-collapse:collapse;text-align:left;font-size:14px;">
          <thead><tr style="background:#f4f6f1;">
            <th style="padding:12px;">Product</th><th style="padding:12px;">Quantity</th>
            <th style="padding:12px;">Price</th><th style="padding:12px;text-align:right;">Item total</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      </td></tr>
      <tr><td style="padding:0 28px 24px;">
        <table style="width:100%;max-width:340px;margin-left:auto;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:6px 0;color:#53645a;">Subtotal</td><td style="padding:6px 0;text-align:right;">${safe(formatPrice(pricing.subtotal))}</td></tr>
          <tr><td style="padding:6px 0;color:#53645a;">Delivery charges</td><td style="padding:6px 0;text-align:right;">${safe(formatPrice(pricing.shippingCharges))}</td></tr>
          ${discountRows}
          <tr><td style="padding:12px 0 0;border-top:1px solid #d8ded7;font-weight:700;">Grand total</td><td style="padding:12px 0 0;border-top:1px solid #d8ded7;text-align:right;font-weight:700;">${safe(formatPrice(pricing.grandTotal))}</td></tr>
        </table>
        <p style="margin:20px 0 0;line-height:1.6;"><strong>Payment:</strong> ${safe(paymentMethod)} · ${safe(paymentStatus)}</p>
        ${orderLink ? `<p style="margin:16px 0 0;"><a href="${safe(orderLink)}" style="color:#174b35;font-weight:700;">View order in admin panel</a></p>` : ""}
      </td></tr>
    </table>
  </body>
</html>`;

  const textItems = items
    .map(
      (item) =>
        `${item.name} | ${item.quantity} | ${item.price} | ${item.total}`,
    )
    .join("\n");
  return {
    subject: `New Order Received - #${orderId}`,
    html,
    text: [
      `New order #${orderId}`,
      `Date: ${createdAt}`,
      `Customer: ${address.name || customer.name || ""}`,
      `Phone: ${address.mobile || customer.mobile || ""}`,
      `Email: ${customer.email || ""}`,
      `Delivery address: ${getAddress(address)}`,
      "Items: name | quantity | price | item total",
      textItems,
      `Subtotal: ${formatPrice(pricing.subtotal)}`,
      `Delivery charges: ${formatPrice(pricing.shippingCharges)}`,
      `Grand total: ${formatPrice(pricing.grandTotal)}`,
      `Payment: ${paymentMethod} - ${paymentStatus}`,
      ...(orderLink ? [`Admin order: ${orderLink}`] : []),
    ].join("\n"),
  };
};

const sendAdminOrderEmail = async (order) => {
  const orderLabel = order.orderNumber || String(order._id || "unknown");
  console.log(`[admin-order-email] Send started for order ${orderLabel}`);

  try {
    const missingConfiguration = getMissingAdminEmailConfig();
    if (missingConfiguration.length > 0) {
      throw new Error(
        `Admin order email is not configured. Set: ${missingConfiguration.join(", ")}.`,
      );
    }

    const transporter = createAdminOrderTransporter();
    await transporter.sendMail({
      from: env.emailFrom,
      to: env.adminNotificationEmail,
      ...buildAdminOrderEmail(order),
    });
    console.log(`[admin-order-email] Send succeeded for order ${orderLabel}`);
  } catch (error) {
    console.error(
      `[admin-order-email] Send failed for order ${orderLabel}: ${error.stack || error.message}`,
    );
    throw error;
  }
};

module.exports = {
  buildAdminOrderEmail,
  createAdminOrderTransporter,
  getAdminEmailConfigStatus,
  sendAdminOrderEmail,
  verifyAdminOrderEmailTransport,
};
