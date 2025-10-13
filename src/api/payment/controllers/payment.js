import Razorpay from "razorpay";
import jwt from "jsonwebtoken";

export default {
  async createPaymentPage(ctx) {
    try {
      // 🧠 Extract JWT token from headers
      const authHeader = ctx.request.header.authorization;

      if (!authHeader) {
        return ctx.unauthorized("No token provided");
      }

      const token = authHeader.split(" ")[1]; // "Bearer <token>"

      // ✅ Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // @ts-ignore
      const userId = decoded.id; // assuming token contains { id, email, ... }

      if (!userId) {
        return ctx.unauthorized("Invalid user token");
      }

      // 🧾 Get payment amount
      const { amount } = ctx.request.body;
      if (!amount) return ctx.badRequest("Amount is required");

      // 💳 Initialize Razorpay
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      // Step 1: Create Razorpay order
      const order = await razorpay.orders.create({
        amount: amount * 100, // in paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          userId, // attach user ID in metadata
        },
      });

      // Step 2: Create Razorpay Payment Link

      const paymentLink = await razorpay.paymentLink.create({
        amount: amount * 100,
        currency: "INR",
        accept_partial: false,
        reference_id: order.id,
        description: `Payment by User ${userId}`,
        notify: {
          sms: true,
          email: true,
        },
        reminder_enable: true,
        callback_url: "http://localhost:1337/api/payment/verify",
        callback_method: "get",
      });

      return ctx.send({
        success: true,
        message: "Payment link created successfully",
        userId,
        orderId: order.id,
        paymentLink: paymentLink.short_url,
      });
    } catch (err) {
      console.error("🧨 Razorpay Error:", err);
      if (err.name === "JsonWebTokenError") {
        return ctx.unauthorized("Invalid or expired token");
      }
      return ctx.internalServerError(
        err.message || "Error creating payment page"
      );
    }
  },
  async find(ctx) {
    try {
      const authHeader = ctx.request.header.authorization;

      if (!authHeader) {
        return ctx.unauthorized("No token provided");
      }

      const token = authHeader.split(" ")[1]; // "Bearer <token>"

      // ✅ Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // @ts-ignore
      const userId = decoded.id; // token should contain { id, email, ... }

      if (!userId) {
        return ctx.unauthorized("Invalid user token");
      }

      // Fetch payments belonging to this user
      const payments = await strapi.db.query("api::payment.payment").findMany({
        where: { login: userId }, // assuming 'login' relation holds user
      });

      return ctx.send({ payments });
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },
};
