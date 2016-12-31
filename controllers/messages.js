// router for /message routes

var twilio = include("twilio");

var router = require("express").Router();

// handles POST to /message/
// Twilio will POST here for an incoming message
router.post("/", function(req, res){

    // we need to get the message text.

    // try responding
    var resp = new twilio.TwimlResponse();

    resp.message("please work!");

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(resp.toString());
})

module.exports = router;