// router for /message routes

var twilio = require("twilio");
var router = require("express").Router();
var geocoder = require("geocoder");

var twilio_helpers = __include("helpers/twilio.js");
var dark_sky = __include("helpers/dark-sky.js");
var ds_client = new dark_sky.DarkSky(process.env.DARK_SKY_KEY);

// handles POST to /message/
// Twilio will POST here for an incoming message
router.post("/", function(req, res){

    __logger.info("printing request");
    console.log(req.body);

    // get the string of the message body
    var message_body = req.body.Body;

    // geocode the message body (assume all of it is the location)
    geocoder.geocode(message_body, function(error, data){

        // on geocoder error, log and return
        if (error) {
            __logger.error("Error with geocoder api:");
            __logger.error(error);
            twilio_helpers.send_twiml(res, ["Error with message body " + message_body + ". (geocoding error response)"]);
            return;
        }

        var results = data.results;

        // if the results list is empty
        if (results.length == 0) {
            __logger.info("No geocoding results for " + message_body);
            twilio_helpers.send_twiml(res, ["Location not found: " + message_body + ". Please try again"]);
            return;
        }

        var coords = results[0].geometry.location;

        // this gets the hourly blurb for a certain location
        ds_client.get_hourly(coords.lat, coords.lng, function(error, body){

            if (error) {
                __logger.error("Error with DarkSky API: ${error}");
                twilio_helpers.send_twiml(res, ["Error retrieving DarkSky forecast for " + message_body]);
                return;
            }

            var reply_string = message_body + ": " + body.hourly.summary;
            twilio_helpers.send_twiml(res, [reply_string]);

        });

    });

})

module.exports = router;