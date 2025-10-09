import jwt from "jsonwebtoken";

export default {
  // 🔹 Add item to cart
  async create(ctx) {
    try {
      const { Title, Price, Image, Quantity } = ctx.request.body;

      // ✅ Get JWT from Authorization header
      const token = ctx.request.header.authorization?.split(" ")[1];
      if (!token) return ctx.unauthorized("No token provided");

      // ✅ Verify JWT
      let userId;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // @ts-ignore
        userId = decoded.id; // login table ID
      } catch (err) {
        return ctx.unauthorized("Invalid token");
      }

      // ✅ Create cart item
      const cartItem = await strapi.db.query("api::cart.cart").create({
        data: {
          Title,
          Price,
          Image,
          Quantity,
          login: {
            connect: [userId], // ✅ Correct relation
          }, // relation
        },
      });

      return ctx.send({ message: "Item added to cart", cartItem });
    } catch (err) {
      console.error("Add to cart error:", err);
      return ctx.internalServerError(err.message);
    }
  },

  // 🔹 Get all cart items for logged-in user
  async getCart(ctx) {
    try {
      const token = ctx.request.header.authorization?.split(" ")[1];
      if (!token) return ctx.unauthorized("No token provided");

      let userId;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // @ts-ignore
        userId = decoded.id;
      } catch (err) {
        return ctx.unauthorized("Invalid token");
      }

      const cartItems = await strapi.db.query("api::cart.cart").findMany({
        where: { login: userId },
        orderBy: { createdAt: "desc" },
      });

      return ctx.send({ cartItems });
    } catch (err) {
      console.error("Get cart error:", err);
      return ctx.internalServerError("Failed to fetch cart");
    }
  },

  // 🔹 Remove item from cart
  async removeFromCart(ctx) {
    try {
      const { id } = ctx.params; // cart item ID
      const token = ctx.request.header.authorization?.split(" ")[1];
      if (!token) return ctx.unauthorized("No token provided");

      let userId;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // @ts-ignore
        userId = decoded.id;
      } catch (err) {
        return ctx.unauthorized("Invalid token");
      }

      // ✅ Check if cart item belongs to this user
      const cartItem = await strapi.db.query("api::cart.cart").findOne({
        where: { id, login: userId },
      });
      if (!cartItem) return ctx.notFound("Cart item not found");

      // ✅ Delete cart item
      await strapi.db.query("api::cart.cart").delete({
        where: { id },
      });

      return ctx.send({ message: "Cart item removed" });
    } catch (err) {
      console.error("Remove from cart error:", err);
      return ctx.internalServerError("Failed to remove cart item");
    }
  },
  // 🔹 Update cart item quantity
  async updateQuantity(ctx) {
    try {
      const { id } = ctx.params; // cart item ID
      const { Quantity } = ctx.request.body; // new quantity
      if (Quantity === undefined) return ctx.badRequest("Quantity is required");

      // ✅ Get JWT from Authorization header
      const token = ctx.request.header.authorization?.split(" ")[1];
      if (!token) return ctx.unauthorized("No token provided");

      let userId;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // @ts-ignore
        userId = decoded.id;
      } catch (err) {
        return ctx.unauthorized("Invalid token");
      }

      // ✅ Find the cart item for this user
      const cartItem = await strapi.db.query("api::cart.cart").findOne({
        where: { id, login: userId },
      });

      if (!cartItem) return ctx.notFound("Cart item not found");

      // ✅ Update Quantity and Price
      const pricePerItem = parseFloat(cartItem.Price) / cartItem.Quantity;
      const newPrice = pricePerItem * Quantity;

      const updatedItem = await strapi.db.query("api::cart.cart").update({
        where: { id },
        data: {
          Quantity,
          Price: newPrice,
        },
      });

      return ctx.send({ message: "Cart updated", cartItem: updatedItem });
    } catch (err) {
      console.error("Update cart error:", err);
      return ctx.internalServerError("Failed to update cart item");
    }
  },
};
