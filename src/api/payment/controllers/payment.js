import Razorpay from "razorpay";
import jwt from "jsonwebtoken";

export default {
  // ✅ 1️⃣ Create Razorpay payment for all items in user's cart
  async createPaymentPage(ctx) {
    try {
      // 🧠 Extract JWT token from headers
      const authHeader = ctx.request.header.authorization;
      if (!authHeader) return ctx.unauthorized("No token provided");

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // @ts-ignore
      const userId = decoded.id;
      if (!userId) return ctx.unauthorized("Invalid user token");

      // 🧾 Fetch all cart items for this user
      const cartItems = await strapi.db.query("api::cart.cart").findMany({
        where: { login: userId },
      });

      if (!cartItems.length) return ctx.badRequest("Cart is empty");

      // 💰 Calculate total amount
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + Number(item.Price) * Number(item.Quantity),
        0
      );

      // 💳 Create Razorpay instance
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      // Create Razorpay order
      const order = await razorpay.orders.create({
        amount: totalAmount * 100, // paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: { userId },
      });

      // Create payment link
      const paymentLink = await razorpay.paymentLink.create({
        amount: totalAmount * 100,
        currency: "INR",
        accept_partial: false,
        reference_id: order.id,
        description: `Payment for all cart items by user ${userId}`,
        notify: { sms: true, email: true },
        reminder_enable: true,
        callback_url: "http://localhost:5173/success",
        callback_method: "get",
      });

      // Save payment record
      const payment = await strapi.db.query("api::payment.payment").create({
        data: {
          amount: totalAmount,
          payment_id: null,
          order_id: order.id,
          condition: "created",
          login: userId,
        },
      });

      return ctx.send({
        success: true,
        message: "Payment link created successfully",
        totalAmount,
        razorpay_order_id: order.id,
        paymentLink: paymentLink.short_url,
        payment,
      });
    } catch (err) {
      console.error("Create payment error:", err);
      return ctx.internalServerError(err.message);
    }
  },

  // ✅ 2️⃣ Verify Razorpay payment and move cart items to orders
  async verify(ctx) {
    try {
      const {
        razorpay_payment_id,
        razorpay_payment_link_reference_id,
        razorpay_payment_link_status,
      } = ctx.query;

      if (
        !razorpay_payment_id ||
        !razorpay_payment_link_reference_id ||
        !razorpay_payment_link_status
      ) {
        return ctx.badRequest("Missing verification parameters");
      }

      // Find payment record
      const payment = await strapi.db.query("api::payment.payment").findOne({
        where: { order_id: razorpay_payment_link_reference_id },
        populate: { login: true },
      });

      if (!payment) return ctx.notFound("Payment record not found");

      // Update payment record
      const updatedPayment = await strapi.db
        .query("api::payment.payment")
        .update({
          where: { id: payment.id },
          data: {
            payment_id: razorpay_payment_id,
            condition:
              razorpay_payment_link_status === "paid" ? "paid" : "failed",
          },
        });

      // ✅ If payment succeeded, move all user's cart items to orders
      if (razorpay_payment_link_status === "paid") {
        const userId = payment.login.id;

        // Fetch all cart items
        const cartItems = await strapi.db.query("api::cart.cart").findMany({
          where: { login: userId },
        });

        for (const item of cartItems) {
          await strapi.db.query("api::order.order").create({
            data: {
              Title: item.Title,
              Price: Number(item.Price) * Number(item.Quantity),
              Quantity: item.Quantity,
              Image: item.Image,
              Condition: "paid",
              login: userId,
              payment: payment.id,
            },
          });
        }

        // Clear the cart
        await strapi.db.query("api::cart.cart").deleteMany({
          where: { login: userId },
        });
      }

      return ctx.send({
        success: true,
        message:
          razorpay_payment_link_status === "paid"
            ? "Payment success — all cart items moved to orders!"
            : "Payment failed",
        payment: updatedPayment,
      });
    } catch (err) {
      console.error("Verification error:", err);
      return ctx.internalServerError(err.message);
    }
  },

  // ✅ 3️⃣ Fetch all payments for logged-in user
  async find(ctx) {
    try {
      const token = ctx.request.header.authorization?.split(" ")[1];
      if (!token) return ctx.unauthorized("No token provided");

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // @ts-ignore
      const userId = decoded.id;

      const payments = await strapi.db.query("api::payment.payment").findMany({
        where: { login: userId },
      });

      return ctx.send({ payments });
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },

  // ✅ 4️⃣ Delete all user payments (optional)
  async delete(ctx) {
    try {
      const token = ctx.request.header.authorization?.split(" ")[1];
      if (!token) return ctx.unauthorized("No token provided");

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // @ts-ignore
      const userId = decoded.id;

      await strapi.db.query("api::payment.payment").deleteMany({
        where: { login: userId },
      });

      return ctx.send({ success: true, message: "All payments deleted" });
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },
};
