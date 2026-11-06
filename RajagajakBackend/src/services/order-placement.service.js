const Order = require("../models/Order.model");
const { sendAdminOrderEmail } = require("./admin-order-email.service");

const saveOrder = async (orderDocument, { session } = {}) => {
  const [savedOrder] = await Order.create(
    [orderDocument],
    session ? { session } : {},
  );
  return savedOrder;
};

const notifyAdminOrder = async (order) => {
  try {
    const populatedOrder = await order.populate("userId", "name mobile email");
    await sendAdminOrderEmail(populatedOrder);
    console.log("Admin email sent / failed: sent");
    return true;
  } catch (error) {
    console.error(`Admin email sent / failed: ${error.message}`);
    return false;
  }
};

module.exports = { saveOrder, notifyAdminOrder };
