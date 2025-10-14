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
    },
    {
      method : "GET" ,
      path :"/payment/verify",
      handler : "payment.verify",
      config : {auth : false}
    },
    {
      method : "DELETE",
      path : "/payment",
      handler : "payment.delete",
      config:{auth : false}
    }
  ],
};
