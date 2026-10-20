const nodemailer = require("nodemailer");
const env = require("../config/env");

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

const getResetLink = (token) => {
  if (!env.frontendUrl) {
    throw new Error("Password reset email configuration is incomplete.");
  }

  let frontendUrl;
  try {
    frontendUrl = new URL(env.frontendUrl);
  } catch {
    throw new Error("Password reset email configuration is incomplete.");
  }

  if (!["https:", "http:"].includes(frontendUrl.protocol)) {
    throw new Error("Password reset email configuration is incomplete.");
  }

  frontendUrl.pathname = `${frontendUrl.pathname.replace(/\/$/, "")}/reset-password`;
  frontendUrl.search = "";
  frontendUrl.hash = "";
  frontendUrl.searchParams.set("token", token);
  return frontendUrl.toString();
};

const sendPasswordResetEmail = async ({ email, name, token }) => {
  const missingConfiguration = [
    ["SMTP_HOST", env.smtpHost],
    ["SMTP_PORT", Number.isInteger(env.smtpPort) && env.smtpPort > 0],
    ["SMTP_USER", env.smtpUser],
    ["SMTP_PASS", env.smtpPass],
    ["EMAIL_FROM", env.emailFrom],
    ["FRONTEND_URL", env.frontendUrl],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingConfiguration.length > 0) {
    throw new Error(
      "Password reset email is not configured. Set the required SMTP and frontend URL environment variables.",
    );
  }

  const resetLink = getResetLink(token);
  const safeName = escapeHtml(name || "there");
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });

  await transporter.sendMail({
    from: env.emailFrom,
    to: email,
    subject: "Reset your Raja Gajak password",
    text: `Hello ${name || "there"},\n\nWe received a request to reset your Raja Gajak account password. Use this link within 30 minutes:\n${resetLink}\n\nIf you did not request this change, you can safely ignore this email.`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:32px 16px;background:#f5f3ed;font-family:Arial,Helvetica,sans-serif;color:#26352b;">
    <table role="presentation" style="width:100%;max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:30px 36px;background:#174b35;color:#fff;">
        <p style="margin:0;color:#d4dc8a;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Raja Gajak</p>
        <h1 style="margin:12px 0 0;font-family:Georgia,serif;font-size:28px;font-weight:600;">Reset your password</h1>
      </td></tr>
      <tr><td style="padding:32px 36px;">
        <p style="margin:0 0 16px;">Hello ${safeName},</p>
        <p style="margin:0 0 24px;line-height:1.6;">We received a request to reset the password for your Raja Gajak account. Choose a new password using the button below.</p>
        <p style="margin:0 0 24px;"><a href="${escapeHtml(resetLink)}" style="display:inline-block;padding:14px 24px;border-radius:8px;background:#174b35;color:#fff;text-decoration:none;font-weight:700;">Reset Password</a></p>
        <p style="margin:0 0 16px;color:#53645a;font-size:14px;line-height:1.6;">This link expires in <strong>30 minutes</strong> and can only be used once.</p>
        <p style="margin:0;color:#53645a;font-size:14px;line-height:1.6;">If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
      </td></tr>
      <tr><td style="padding:18px 36px;background:#f7f7f2;color:#718076;font-size:12px;">Raja Gajak · A considered space for every member.</td></tr>
    </table>
  </body>
</html>`,
  });
};

module.exports = { sendPasswordResetEmail };
