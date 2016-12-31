// router for /message routes

var twilio = require("twilio");
var router = require("express").Router();
var dark_sky = __include("helpers/dark-sky.js");
var ds_client = new dark_sky.DarkSky(process.env.DARK_SKY_KEY);

// handles POST to /message/
// Twilio will POST here for an incoming message
router.post("/", function(req, res){

    // we need to get the message text. assume it's zip code first
    ds_client.get_hourly("40.2187", "-74.8507", function(error, body){

        if (error) {
            __logger.error("Error with DarkSky API: ${error}");
            return;
        }

        // try responding
        var resp = new twilio.TwimlResponse();

        resp.message(body.hourly.summary);

        __logger.info("responding with %s", resp.toString());

        res.writeHead(200, {'Content-Type': 'text/xml'});
        res.end(resp.toString());

    });

})

module.exports = router;