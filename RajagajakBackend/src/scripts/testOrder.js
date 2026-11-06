const mongoose = require("mongoose");
const env = require("../config/env");
const { createTestOrder } = require("../services/test-order.service");

const run = async () => {
  if (env.nodeEnv === "production") {
    throw new Error("Test orders are disabled in production.");
  }

  await mongoose.connect(env.mongoUri);
  const { order, notification } = await createTestOrder();
  await notification;
  console.log(`Test run complete: ${order.orderNumber}`);
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
