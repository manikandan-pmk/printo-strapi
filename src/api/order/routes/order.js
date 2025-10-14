export default {
    routes : [{
        method : "GET",
        path : "/order",
        handler : "order.find",
        config : {auth :false}
    },
    {
        method : "PUT",
        path: "/order/cancel/:id",
        handler : "order.cancel",
        config : {
            auth : false
        }
    },
    {
        method : "DELETE",
        path : "/order/:id?",
        handler : "order.delete",
        config : {
            auth : false
        }
    }
]
}