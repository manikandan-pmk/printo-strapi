import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default {
  // 🔹 Create a new payment
  async payment(ctx) {
    try {
      const { amount } = ctx.request.body;

      if (!amount) {
        return ctx.badRequest("Amount is required");
      }

      // 1️⃣ Create Stripe Checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: "Printo Payment",
              },
              unit_amount: amount*100, // amount in cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: "http://localhost:5173/success",
        cancel_url: "http://localhost:5173/cancel",
      });

      // 2️⃣ Get creation time (convert from UNIX to readable)
      const createdAt = new Date(session.created * 1000);

      // 3️⃣ Save payment info in Strapi DB
      await strapi.db.query("api::payment.payment").create({
        data: {
          amount,
          Created: createdAt,
        },
      });

      // 4️⃣ Send session URL back to frontend
      return ctx.send({
        url: session.url,
        created: createdAt,
        message: "Payment Created Successfully",
      });
    } catch (err) {
      console.error("Stripe Error:", err.message);
      return ctx.internalServerError(err.message);
    }
  },

  // 🔹 Get all payments
  async get(ctx) {
    try {
      const payments = await strapi.db.query("api::payment.payment").findMany();
      return ctx.send({ data: payments });
    } catch (err) {
      console.error("Error fetching payments:", err);
      return ctx.internalServerError(err.message);
    }
  },
};
