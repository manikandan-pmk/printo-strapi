import jwt from "jsonwebtoken";

export default {
  async create(ctx) {
    try {
      const {
        Name,
        MobileNumber,
        Email,
        Country,
        Address_line_1,
        Address_line_2,
        City,
        State,
        Postal_code,
        type,
      } = ctx.request.body;

      // ✅ 1️⃣ Validate required fields
      if (
        !Name ||
        !MobileNumber ||
        !Email ||
        !Country ||
        !Address_line_1 ||
        !City ||
        !State ||
        !Postal_code ||
        !type
      ) {
        return ctx.badRequest("All required fields must be filled");
      }

      // ✅ 2️⃣ Extract JWT token from headers
      const authHeader = ctx.request.header.authorization;
      if (!authHeader) return ctx.unauthorized("No token provided");

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // @ts-ignore
      const userId = decoded.id; // 👈 ensure your JWT payload has an `id` field

      if (!userId) return ctx.unauthorized("Invalid user token");

      // ✅ 3️⃣ Create user detail entry
      const create = await strapi.db
        .query("api::user-detail.user-detail")
        .create({
          data: {
            Name,
            MobileNumber,
            Email,
            Country,
            Address_line_1,
            Address_line_2,
            City,
            State,
            Postal_code,
            type,
            login: userId, // 👈 assuming relation with Login collection
          },
        });

      // ✅ 4️⃣ Return success
      return ctx.send({
        message: "User details created successfully",
        data: create,
      });
    } catch (err) {
      console.error("Error creating user detail:", err);
      return ctx.internalServerError(err.message);
    }
  },
  async find(ctx) {
    try {
      // ✅ 2️⃣ Extract JWT token from headers
      const authHeader = ctx.request.header.authorization;
      if (!authHeader) return ctx.unauthorized("No token provided");

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // @ts-ignore
      const userId = decoded.id; // 👈 ensure your JWT payload has an `id` field

      if (!userId) return ctx.unauthorized("Invalid user token");

      const get = await strapi.db
        .query("api::user-detail.user-detail")
        .findOne({
          where: { login: userId },
        });

      return ctx.send({
        success: true,
        data: get,
      });
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },
  async delete(ctx) {
    try {
      // ✅ 2️⃣ Extract JWT token from headers
      const { id } = ctx.params;
      const authHeader = ctx.request.header.authorization;
      if (!authHeader) return ctx.unauthorized("No token provided");

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // @ts-ignore
      const userId = decoded.id; // 👈 ensure your JWT payload has an `id` field

      if (!userId) return ctx.unauthorized("Invalid user token");

      const userDetail = await strapi.db
        .query("api::user-detail.user-detail")
        .findOne({
          where: { id, login: userId },
        });

      if (!userDetail) {
        return ctx.badRequest("No Address Found");
      }

      const deleteDetail = await strapi.db
        .query("api::user-detail.user-detail")
        .delete({
          where: { id },
        });

        return ctx.send(deleteDetail)
    } catch (err) {
      return ctx.internalServerError(err.message);
    }
  },
};
