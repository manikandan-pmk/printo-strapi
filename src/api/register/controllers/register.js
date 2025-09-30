const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = {
  async register(ctx) {
    try {
      const { Username, Email, Password, RePassword } = ctx.request.body;

      // 1. Validate fields
      if (!Username || !Email || !Password || !RePassword) {
        return ctx.badRequest("All fields required");
      }

      if (Password !== RePassword) {
        return ctx.badRequest("Passwords do not match");
      }

      // 2. Check duplicates
      const checkEmailUser = await strapi.db
        .query("api::register.register")
        .findOne({ where: { Email } });

      if (checkEmailUser) {
        return ctx.badRequest("Email already registered");
      }

      const checkUsername = await strapi.db
        .query("api::register.register")
        .findOne({ where: { Username } });

      if (checkUsername) {
        return ctx.badRequest("Username already registered");
      }

      // 3. Hash password
      const hashPassword = await bcrypt.hash(Password, 10);

      // 4. Save user
      const user = await strapi.db.query("api::register.register").create({
        data: {
          Username,
          Email,
          Password: hashPassword,
          publishedAt: new Date(), // auto publish
        },
      });

      // 5. Try sending email (non-blocking)
      try {
        await resend.emails.send({
          from: "Acme <onboarding@resend.dev>", // sandbox sender
          to: Email,
          subject: "Registration Successful",
          html: `<p>Hello ${Username},</p><p>Your registration was successful!</p>`,
        });
        console.log("✅ Email sent to", Email);
      } catch (emailError) {
        console.error("❌ Email sending failed:", emailError);
      }

      // 6. Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.Email },
        process.env.JWT_SECRET || "super-secret-key",
        { expiresIn: "7d" }
      );

      // 7. Return response
      return ctx.send({
        message: "User registered successfully",
        user: {
          id: user.id,
          Username: user.Username,
          Email: user.Email,
        },
        jwt: token,
      });
    } catch (err) {
      console.error("Register Error:", err);
      return ctx.internalServerError("Something went wrong during registration");
    }
  },

  async find(ctx) {
    const users = await strapi.db.query("api::register.register").findMany();
    return ctx.send({ data: users });
  },

  async delete(ctx) {
    const { id } = ctx.params;
    let deleted;

    if (id) {
      deleted = await strapi.db.query("api::register.register").delete({
        where: { id: parseInt(id) },
      });
    } else {
      deleted = await strapi.db.query("api::register.register").deleteMany({});
    }

    return ctx.send({ data: deleted });
  },
};
