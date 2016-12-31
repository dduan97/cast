// router for /message routes

var twilio = require("twilio");

var router = require("express").Router();

// handles POST to /message/
// Twilio will POST here for an incoming message
router.post("/", function(req, res){

    // we need to get the message text. assume it's zip code first

    // try responding
    var resp = new twilio.TwimlResponse();

    resp.message("please work!");

    __logger.info("responding with %s", resp.toString());

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(resp.toString());
})

module.exports = router;