import Razorpay from "razorpay";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
        // Safe response on refresh
        return ctx.send({ success: false, message: "No payment to verify" });
      }

      const payment = await strapi.db.query("api::payment.payment").findOne({
        where: { order_id: razorpay_payment_link_reference_id },
        populate: { login: true },
      });

      if (!payment) return ctx.notFound("Payment record not found");
      if (!payment.login)
        return ctx.internalServerError("Payment user data not found");

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

      if (razorpay_payment_link_status === "paid") {
        const userId = payment.login.id;
        const cartItems = await strapi.db
          .query("api::cart.cart")
          .findMany({ where: { login: userId } });

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

        // Generate PDF and send email safely
        try {
          const invoiceDir = path.join(process.cwd(), "public", "invoices");
          if (!fs.existsSync(invoiceDir))
            fs.mkdirSync(invoiceDir, { recursive: true });
          const filePath = path.join(invoiceDir, `invoice-${payment.id}.pdf`);
          const doc = new PDFDocument();
          doc.pipe(fs.createWriteStream(filePath));
          doc.fontSize(22).text("Invoice", { align: "center" });
          doc.moveDown();
          doc.text(`Invoice ID : ${payment.id}`);
          doc.text(`Order ID: ${payment.order_id}`);
          doc.text(`Payment ID: ${razorpay_payment_id}`);
          doc.text(`User: ${payment.login.Username}`);
          doc.text(`Email: ${payment.login.Email}`);
          doc.moveDown();
          doc.text("Items:");
          cartItems.forEach((item) => {
            doc.text(
              `${item.Title} - ₹${item.Price} x ${item.Quantity} = ₹ ${Number(item.Price) * Number(item.Quantity)}`
            );
          });
          const total = cartItems.reduce(
            (sum, item) => sum + Number(item.Price) * Number(item.Quantity),
            0
          );
          doc.moveDown();
          doc.fontSize(14).text(`Total: ₹${total}`, { align: "right" });
          doc.end();

          const fileBuffer = fs.readFileSync(filePath);
          await resend.emails.send({
            from: "Acme <onboarding@resend.dev>",
            to: payment.login.Email,
            subject: `Invoice for Order #${payment.order_id}`,
            html: `<h2>Thank you, ${payment.login.Username}!</h2><p>Your payment has been received successfully.</p>`,
            attachments: [
              {
                filename: `invoice-${payment.id}.pdf`,
                content: fileBuffer.toString("base64"),
              },
            ],
          });
        } catch (pdfErr) {
          console.error("Invoice generation/email failed:", pdfErr.message);
        }

        await strapi.db
          .query("api::cart.cart")
          .deleteMany({ where: { login: userId } });
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
