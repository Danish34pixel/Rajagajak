const env = require("../config/env");
const {
  createAdminOrderTransporter,
  getAdminEmailConfigStatus,
  verifyAdminOrderEmailTransport,
} = require("../services/admin-order-email.service");

const sendTestMail = async () => {
  console.log(
    "[test-mail] Environment variables configured:",
    JSON.stringify(getAdminEmailConfigStatus()),
  );
  const verified = await verifyAdminOrderEmailTransport();
  if (!verified) {
    throw new Error(
      "SMTP transporter verification failed; see configuration logs.",
    );
  }

  const result = await createAdminOrderTransporter().sendMail({
    from: env.emailFrom,
    to: env.adminNotificationEmail,
    subject: "Raja Gajak SMTP test",
    text: "This is a test email to verify the Raja Gajak SMTP configuration.",
  });
  console.log(`[test-mail] Dummy email sent. Message ID: ${result.messageId}`);
};

sendTestMail().catch((error) => {
  console.error(`[test-mail] Failed: ${error.stack || error.message}`);
  process.exitCode = 1;
});
