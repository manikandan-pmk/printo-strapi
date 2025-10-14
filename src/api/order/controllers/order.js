import jwt from "jsonwebtoken";

export default {
  // ✅ Fetch logged-in user's orders
  async find(ctx) {
    try {
      const authHeader = ctx.request.header.authorization;
      if (!authHeader) return ctx.unauthorized("No token provided");

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // @ts-ignore
      const userId = decoded.id;
      if (!userId) return ctx.unauthorized("Invalid user token");

      const orders = await strapi.db.query("api::order.order").findMany({
        where: { login: userId },
        populate: {
          payment: true,
          orderItems: { populate: ["product"] }, // replace "product" with your relation
        },
      });

      return ctx.send({ success: true, orders });
    } catch (err) {
      console.error(err);
      return ctx.internalServerError(err.message || "Error fetching orders");
    }
  },

  // ❌ Cancel an order (only if it belongs to user)
  async cancel(ctx) {
    try {
      const authHeader = ctx.request.header.authorization;
      if (!authHeader) return ctx.unauthorized("No token provided");

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // @ts-ignore
      const userId = decoded.id;
      if (!userId) return ctx.unauthorized("Invalid user token");

      const { id } = ctx.params; // order id from URL
      if (!id) return ctx.badRequest("Order ID is required");

      // 1️⃣ Find the order and ensure it belongs to this user
      const order = await strapi.db.query("api::order.order").findOne({
        where: { id, login: userId },
      });

      if (!order) return ctx.notFound("Order not found or unauthorized");

      // 2️⃣ Update condition to "cancelled"
      const updatedOrder = await strapi.db.query("api::order.order").update({
        where: { id },
        data: { Condition: "cancelled" },
      });

      return ctx.send({
        success: true,
        message: "Order cancelled successfully",
        order: updatedOrder,
      });
    } catch (err) {
      console.error("Cancel order error:", err);
      if (err.name === "JsonWebTokenError")
        return ctx.unauthorized("Invalid or expired token");
      return ctx.internalServerError(err.message || "Error cancelling order");
    }
  },
  async delete(ctx) {
    try {
      const authHeader = ctx.request.header.authorization;
      if (!authHeader) return ctx.unauthorized("No token provided");

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // @ts-ignore
      const userId = decoded.id;
      if (!userId) return ctx.unauthorized("Invalid user token");

      const { id } = ctx.params;

      if (id) {
        // Delete single order by ID
        const order = await strapi.db.query("api::order.order").findOne({
          where: { id, login: userId },
        });

        if (!order) return ctx.notFound("Order not found or unauthorized");

        await strapi.db.query("api::order.order").delete({
          where: { id },
        });

        return ctx.send({
          success: true,
          message: "Order deleted successfully",
        });
      } else {
        // Delete all user's orders
        const deleted = await strapi.db.query("api::order.order").deleteMany({
          where: { login: userId },
        });

        return ctx.send({
          success: true,
          message: `${deleted.count || 0} orders deleted for user ${userId}`,
        });
      }
    } catch (err) {
      console.error("Delete order error:", err);
      if (err.name === "JsonWebTokenError")
        return ctx.unauthorized("Invalid or expired token");
      return ctx.internalServerError(err.message || "Error deleting order");
    }
  },
};
