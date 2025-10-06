module.exports = {
    routes :[
        {
            method : "POST",
            path : "/payment",
            handler : "payment.payment",
            config : {auth :false}
        },
        {
            method : "GET",
            path : "/payment",
            handler : "payment.get",
            config : {auth :false}
        }
    ]
}