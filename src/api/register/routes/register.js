module.exports = {
  routes: [
    {
      method: "POST",
      path: "/registers",
      handler: "register.register",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/registers",
      handler: "register.find",
      config: { auth: false },
    },
    {
      method: "DELETE",
      path: "/registers/:id?",
      handler: "register.delete",
      config: { auth: false },
    },
  ],
};
