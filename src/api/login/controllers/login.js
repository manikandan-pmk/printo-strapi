import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
export default {
  async login(ctx) {
    try {
      const { Username, Email, Password } = ctx.request.body;

      // 1️⃣ Require Email/Username + Password
      if ((!Username && !Email) || !Password) {
        return ctx.badRequest("Email or Username and Password are required");
      }

      // 2️⃣ Find user in register collection
      const registeredUser = await strapi.db
        .query("api::register.register")
        .findOne({
          where: Email ? { Email } : { Username },
        });

      if (!registeredUser) {
        return ctx.badRequest("User not found");
      }

      // 3️⃣ Validate password
      const validPassword = await bcrypt.compare(
        Password,
        registeredUser.Password
      );
      if (!validPassword) {
        return ctx.badRequest("Invalid password");
      }

      // 4️⃣ Check if user is already logged in (exists in login collection)
      const existingLogin = await strapi.db.query("api::login.login").findOne({
        where: { Email: registeredUser.Email },
      });

      if (existingLogin) {
        return ctx.badRequest("User already logged in");
      }

      // 5️⃣ Generate new JWT
      const token = jwt.sign(
        {
          id: registeredUser.id,
          Email: registeredUser.Email,
          Username: registeredUser.Username,
        },
        process.env.JWT_SECRET || "super-secret-key",
        { expiresIn: "2d" }
      );

      // 6️⃣ Save login record
      const loginuser = await strapi.db.query("api::login.login").create({
        data: {
          Username: registeredUser.Username,
          Email: registeredUser.Email,
          jwt: token,
        },
      });

      // 7️⃣ Return response
      return ctx.send({
        message: "Login successful",
        jwt: token,
        user: {
          id: registeredUser.id,
          Username: registeredUser.Username,
          Email: registeredUser.Email,
        },
        loginRecord: loginuser,
      });
    } catch (err) {
      console.error("Login error:", err);
      return ctx.internalServerError(err.message);
    }
  },
  async find(ctx) {
    const users = await strapi.db.query("api::login.login").findMany();
    return ctx.send({ data: users });
  },
  async delete(ctx) {
    const { id } = ctx.params;
    let deleted;

    if (id) {
      deleted = await strapi.db.query("api::login.login").delete({
        where: { id: parseInt(id) },
      });
    } else {
      deleted = await strapi.db.query("api::login.login").deleteMany({});
    }

    return ctx.send({ data: deleted });
  },
  async logout(ctx) {
    try {
      const { jwt, Email, Username } = ctx.request.body;

      if (!jwt) {
        return ctx.badRequest("No Token is Provided");
      }

      const deleted = await strapi.db
        .query("api::login.login")
        .delete({ where: { jwt } });

      if (!deleted) {
        return ctx.notFound("Token not Found or already logged out");
      }
      await resend.emails.send({
        from: "Acme <onboarding@resend.dev>",
        to: deleted.Email,
        subject: "Logout Notification",
        html: `<p>Hello ${deleted.Username},</p><p>Your Logout was successful!</p>`,
      });
      return ctx.send({ message: "Logout Sucessfull" });
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },
};
