const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = {
  // 1️⃣ Register a new user
  async register(ctx) {
    try {
      const { Username, Email, Password, RePassword } = ctx.request.body;

      // Validate all fields
      if (!Username || !Email || !Password || !RePassword) {
        return ctx.badRequest("All fields are required");
      }

      if (Password !== RePassword) {
        return ctx.badRequest("Passwords do not match");
      }

      // Check for duplicates
      const emailExists = await strapi.db
        .query("api::register.register")
        .findOne({ where: { Email } });
      if (emailExists) return ctx.badRequest("Email already registered");

      const usernameExists = await strapi.db
        .query("api::register.register")
        .findOne({ where: { Username } });
      if (usernameExists) return ctx.badRequest("Username already registered");

      // Hash the password
      const hashedPassword = await bcrypt.hash(Password, 10);

      // Save user
      const user = await strapi.db.query("api::register.register").create({
        data: {
          Username,
          Email,
          Password: hashedPassword,
          publishedAt: new Date(),
        },
      });

      // Send welcome email (non-blocking)
      try {
        await resend.emails.send({
          from: "Acme <onboarding@resend.dev>",
          to: Email,
          subject: "Registration Successful",
          html: `<p>Hello ${Username},</p><p>Your registration was successful!</p>`,
        });
      } catch (err) {
        console.error("Email sending failed:", err);
      }

      return ctx.send({
        message: "User registered successfully",
        user: {
          id: user.id,
          Username: user.Username,
          Email: user.Email,
        },
      });
    } catch (err) {
      console.error("Register Error:", err);
      return ctx.internalServerError(err.message);
    }
  },

  // 2️⃣ Get all users
  async find(ctx) {
    const users = await strapi.db.query("api::register.register").findMany();
    return ctx.send({ data: users });
  },

  // 3️⃣ Delete user by ID
  async delete(ctx) {
    try {
      const { documentId } = ctx.params;

      if (documentId) {
        // Delete a single user
        const deleted = await strapi.db.query("api::register.register").delete({
          where: { documentId },
        });

        if (!deleted) {
          return ctx.notFound("User not found");
        }

        return ctx.send({
          message: "User deleted successfully",
          data: deleted,
        });
      } else {
        // Delete all users
        const deletedAll = await strapi.db
          .query("api::register.register")
          .deleteMany({});
        return ctx.send({
          message: "All users deleted successfully",
          data: deletedAll,
        });
      }
    } catch (err) {
      console.error("Delete Error:", err);
      return ctx.internalServerError(err.message);
    }
  },

  // 4️⃣ Forgot Password
  async forgotpassword(ctx) {
    try {
      const Email = ctx.request.body.Email || ctx.request.body.data?.Email;
      if (!Email) return ctx.badRequest("Email Field is Required");

      const user = await strapi.db
        .query("api::register.register")
        .findOne({ where: { Email } });
      if (!user) return ctx.badRequest("User Not Found");

      // Generate reset token (JWT)
      const token = jwt.sign(
        { id: user.id, Email: user.Email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Save token and expiry
      await strapi.db.query("api::register.register").update({
        where: { id: user.id },
        data: {
          resetPasswordToken: token,
          resetPasswordExpiry: Date.now() + 3600000, // 1 hour
        },
      });

      const resetLink = `https://yourfrontend.com/reset-password?token=${token}`;

      // Send reset email
      await resend.emails.send({
        from: "Acme <onboarding@resend.dev>",
        to: Email,
        subject: "Reset Your Password",
        html: `<p>Hello ${user.Username},</p>
               <p>Click the link below to reset your password:</p>
               <p><a href="${resetLink}">${resetLink}</a></p>`,
      });

      return ctx.send({
        message: "Email has been sent for reset password",
      });
    } catch (err) {
      console.error("Forgot Password Error:", err);
      return ctx.internalServerError(err.message);
    }
  },

  // 5️⃣ Reset Password
  async resetpassword(ctx) {
    try {
      const { token, newPassword } = ctx.request.body;

      if (!token || !newPassword) {
        return ctx.badRequest("Token and new password are required");
      }

      // Find user by reset token
      const user = await strapi.db.query("api::register.register").findOne({
        where: { resetPasswordToken: token },
      });

      if (!user) return ctx.badRequest("Invalid reset token");
      if (user.resetPasswordExpiry < Date.now()) {
        return ctx.badRequest("Reset token has expired");
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and clear token fields
      await strapi.db.query("api::register.register").update({
        where: { id: user.id },
        data: {
          Password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpiry: null,
        },
      });

      return ctx.send({ message: "Password successfully updated" });
    } catch (err) {
      console.error("Reset Password Error:", err);
      return ctx.internalServerError(err.message);
    }
  },
};
