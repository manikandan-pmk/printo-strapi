export default {
    routes : [{
        method : "POST",
        path:"/user-detail",
        handler : "user-detail.create",
        config : {
            auth : false
        }
    },
    {
        method :"GET",
        path : "/user-detail",
        handler : "user-detail.find",
        config : {
            auth : false
        }
    }, 
    {
        method : "DELETE" ,
        path : "/user-detail",
        handler : "user-detail.delete",
        config:{
            auth : false
        }
    }
]
}