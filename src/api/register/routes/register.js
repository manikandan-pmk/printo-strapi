module.exports = {
  routes: [
    {
      method: "POST",
      path: "/registers",                    
      handler: "register.register",  
      config: { auth: false },
    },
  ],
};
