export default {
  routes: [
    {
      method: "POST",
      path: "/payment",
      handler: "payment.createPaymentPage",
      config: { auth: false },
    },
    {
      method : "GET",
      path :"/payment",
      handler : "payment.find",
      config:{auth :false}
    }
  ],
};
