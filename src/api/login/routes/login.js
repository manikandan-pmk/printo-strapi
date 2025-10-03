module.exports = {
  routes: [
    {
      method: "POST",
      path: "/login",
      handler: "login.login",
      config: { auth: {} } // must be public, user does not have JWT yet
    },
    {
      method: "GET",
      path: "/login",
      handler: "login.find",
      config: { auth: false } // must be public, user does not have JWT yet
    },
    {
      method: "DELETE",
      path: "/login/:id?",
      handler: "login.delete",
      config: { auth: false },
    },
  ]
};
