// router for /message routes

var router = require("express").Router();

// handles POST to /message/
// Twilio will POST here for an incoming message
router.post("/", function(req, res){
    __logger.info("POST: %s", req.originalUrl);
    res.send("hello again!");
})

module.exports = router;