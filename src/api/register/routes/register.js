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
    {
      method: "POST",
      path: "/forgotpassword",
      handler: "register.forgotpassword",
      config: { auth: false },
    },
    {
      method: "PUT",
      path: "/resetpassword",
      handler: "register.resetpassword",
      config: { auth: false },
    }
  ],
};
