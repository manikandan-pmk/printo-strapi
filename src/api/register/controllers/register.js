const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = {
  async register(ctx) {
    try {
      const { Username, Email, Password, RePassword } = ctx.request.body;

      if (!Username || !Email || !Password || !RePassword) {
        return ctx.badRequest("All fields required");
      }

      if (Password !== RePassword) {
        return ctx.badRequest("Passwords do not match");
      }

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
        return ctx.badRequest("Username already Registered");
      }

      const hashPassword = await bcrypt.hash(Password, 10);

      const user = await strapi.db.query("api::register.register").create({
        data: {
          Username,
          Email,
          Password: hashPassword,
        },
      });

      await resend.emails.send({
        from: "Acme <onboarding@resend.dev>", // testing only
        to: Email,
        subject: "Registration Successful",
        html: `<p>Hello ${Username},</p><p>Your registration was successful!</p>`,
      });

      const token = jwt.sign(
        { id: user.id, email: user.Email },
        process.env.JWT_SECRET || "super-secret-key",
        { expiresIn: "7d" }
      );

      return ctx.send({
        message: "User registered successfully And Email Sent",
        user: { id: user.id, Username: user.Username, Email: user.Email },
        jwt: token,
      });
    } catch (err) {
      console.error("Register Error:", err);
      return ctx.internalServerError(
        "Something went wrong during registration"
      );
    }
  },
};
