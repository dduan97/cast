// router for /message routes

var twilio = require("twilio");
var router = require("express").Router();
var geocoder = require("geocoder");

var dark_sky = __include("helpers/dark-sky.js");
var ds_client = new dark_sky.DarkSky(process.env.DARK_SKY_KEY);

// handles POST to /message/
// Twilio will POST here for an incoming message
router.post("/", function(req, res){

    __logger.info("printing body of request");
    console.log(req.body);

    // get the string of the message body
    var message_body = req.body.Body;

    // geocode the message body (assume all of it is the location)
    geocoder.geocode(message_body, function(error, data){

        // on geocoder error, log and return
        if (error) {
            __logger.error("Error with geocoder api: ${error}");
        }

        var results = data.results;
        var coords = results[0].geometry.location;

        // this gets the hourly blurb for a certain location
        ds_client.get_hourly(coords.lat, coords.lng, function(error, body){

            if (error) {
                __logger.error("Error with DarkSky API: ${error}");
                return;
            }

            // try responding
            var resp = new twilio.TwimlResponse();

            resp.message(message_body + ": " + body.hourly.summary);

            __logger.info("responding with %s", resp.toString());

            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(resp.toString());

        });

    });

})

module.exports = router;