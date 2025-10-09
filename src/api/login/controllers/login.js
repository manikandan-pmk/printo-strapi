import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default {
  /**
   * 🔐 LOGIN CONTROLLER — FULL AUTH
   * --------------------------------
   * 1. Validates input (Username / Email / Password)
   * 2. Checks user in "register" collection
   * 3. Validates password using bcrypt
   * 4. Prevents duplicate login (if JWT already exists)
   * 5. Creates new JWT token for valid login
   * 6. Saves token in login table
   * 7. Returns token + user data
   */
  async login(ctx) {
    try {
      const { Username, Email, Password } = ctx.request.body;

      // 🧱 Step 1: Basic validation
      if ((!Username && !Email) || !Password) {
        return ctx.badRequest("Email/Username and Password are required");
      }

      // 🧱 Step 2: Find user in "register" table
      const registeredUser = await strapi.db
        .query("api::register.register")
        .findOne({
          where: Email ? { Email } : { Username },
        });

      if (!registeredUser) {
        return ctx.badRequest("User not found. Please register first.");
      }

      // 🧱 Step 3: Validate password
      const validPassword = await bcrypt.compare(
        Password,
        registeredUser.Password
      );
      if (!validPassword) {
        return ctx.badRequest("Invalid password");
      }

      // 🧱 Step 4: Check login table
      let loginUser = await strapi.db.query("api::login.login").findOne({
        where: { Email: registeredUser.Email },
      });

      // 🧱 Step 5: If already logged in → reject duplicate login
      if (loginUser && loginUser.jwt) {
        return ctx.send({
          message: "User already logged in",
          jwt: loginUser.jwt,
          user: {
            id: loginUser.id,
            Username: loginUser.Username,
            Email: loginUser.Email,
          },
        });
      }

      // 🧱 Step 6: Create login record if missing
      if (!loginUser) {
        loginUser = await strapi.db.query("api::login.login").create({
          data: {
            Username: registeredUser.Username,
            Email: registeredUser.Email,
          },
        });
      }

      // 🧱 Step 7: Generate new JWT
      const token = jwt.sign(
        {
          id: loginUser.id,
          Email: loginUser.Email,
          Username: loginUser.Username,
        },
        process.env.JWT_SECRET || "super-secret-key",
        { expiresIn: "2d" }
      );

      // 🧱 Step 8: Save token in DB
      await strapi.db.query("api::login.login").update({
        where: { id: loginUser.id },
        data: { jwt: token },
      });

      // 🧱 Step 9: Respond with success
      return ctx.send({
        message: "Login successful",
        jwt: token,
        user: {
          id: loginUser.id,
          Username: loginUser.Username,
          Email: loginUser.Email,
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      return ctx.internalServerError("Login failed");
    }
  },

  /**
   * 🚪 LOGOUT CONTROLLER
   * --------------------------------
   * 1. Accepts JWT in body
   * 2. Finds corresponding user
   * 3. Clears JWT (invalidates session)
   * 4. Optional email notification
   */
  async logout(ctx) {
    try {
      const { jwt: token } = ctx.request.body;

      if (!token) {
        return ctx.badRequest("No token provided");
      }

      const user = await strapi.db
        .query("api::login.login")
        .findOne({ where: { jwt: token } });

      if (!user) {
        return ctx.notFound("Session not found or already logged out");
      }

      // Invalidate JWT
      await strapi.db.query("api::login.login").update({
        where: { id: user.id },
        data: { jwt: null },
      });

      // Optional: Send logout email
      if (user.Email && resend) {
        await resend.emails.send({
          from: "Acme <onboarding@resend.dev>",
          to: user.Email,
          subject: "Logout Notification",
          html: `<p>Hello ${user.Username},</p><p>You have successfully logged out.</p>`,
        });
      }

      return ctx.send({ message: "Logout successful" });
    } catch (err) {
      console.error("Logout error:", err);
      return ctx.internalServerError("Logout failed");
    }
  },

  /**
   * 👀 GET ALL LOGINS
   * (Admin utility)
   */
  async find(ctx) {
    try {
      const users = await strapi.db.query("api::login.login").findMany();
      return ctx.send({ data: users });
    } catch (err) {
      console.error("Fetch logins error:", err);
      return ctx.internalServerError("Error fetching login data");
    }
  },

  /**
   * ❌ DELETE LOGIN RECORD(S)
   * (Admin utility)
   */
  async delete(ctx) {
    try {
      const { id } = ctx.params;
      let result;

      if (id) {
        result = await strapi.db.query("api::login.login").delete({
          where: { id: parseInt(id) },
        });
      } else {
        result = await strapi.db.query("api::login.login").deleteMany({});
      }

      return ctx.send({ message: "Deleted successfully", data: result });
    } catch (err) {
      console.error("Delete error:", err);
      return ctx.internalServerError("Failed to delete");
    }
  },
};
