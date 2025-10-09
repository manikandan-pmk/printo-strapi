export default {
  routes: [
    {
      method: "POST",
      path: "/carts",
      handler: "cart.create",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/carts",
      handler: "cart.getCart",
      config: { auth: false },
    },
    {
      method: "DELETE",
      path: "/carts/:id",
      handler: "cart.removeFromCart",
      config: { auth: false },
    },
    {
      method: "PUT",
      path: "/carts/:id/quantity",
      handler: "cart.updateQuantity",
      config: { auth: false },
    },
  ],
};
