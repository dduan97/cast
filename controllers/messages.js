// router for /message routes
// TODO: stop using res.offset (grumble grumble) and parse res.timezone instead

var twilio = require("twilio");
var router = require("express").Router();
var geocoder = require("geocoder");
var _ = require("lodash");

var twilioHelpers = __include("helpers/twilio.js");
var darkSky = __include("helpers/dark-sky.js");
var forecasts = __include("helpers/forecasts.js"); 
var dsClient = new darkSky.DarkSky(process.env.DARK_SKY_KEY);

// a list of supported forecasts
var supportedForecasts = ["currently",
                            "minutely",
                            "daily",
                            "alerts",
                            "hourly"];

// extend the Date class to be able to get the day of week
Date.prototype.getUTCDayOfWeek = function(){   
    var days = ["Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday"]
    return days[ this.getUTCDay() ];
};

// middleware to parse our message body
function parseIncomingMessage(req, res, next){
    // get the request message body, split by word
    var messageBody = req.body.Body.match(/\S+/g);
    messageBody = messageBody.map((e) => e.toLowerCase());

    // if the body is empty
    if (messageBody.length == 0) {
        req.body.Body = {
            command: "",
            location: ""
        }
        next();
    } else if (_.indexOf(supportedForecasts, messageBody[0]) >= 0) {
        // command is known
        var command = messageBody.shift();
        var location = messageBody.join(" ");

        // first word is the forecast type/command, the rest is the location
        var parsedMessage = {
            command: command,
            location: location
        }

        req.body.Body = parsedMessage;
        next();
    } else {
        // command is unknown and probably a bad request
        var command = "";
        var location = messageBody.join(" ");

        // first word is the forecast type/command, the rest is the location
        var parsedMessage = {
            command: command.toLowerCase(),
            location: location.toLowerCase()
        }

        req.body.Body = parsedMessage;
        next();
    }
}



// handles POST to /message/
// Twilio will POST here for an incoming message
router.post("/", parseIncomingMessage, function(req, res){

    __logger.info("printing request");
    console.log(req.body);

    // get the command and the location
    var command = req.body.Body.command;
    var location = req.body.Body.location;

    // if there is no location
    if (!location) {
        __logger.info("no location in the body");
        twilioHelpers.sendTwiml(res, ["No location body found (maybe this will \
            be supported later, who knows"]);
        return;
    }

    // geocode the location
    geocoder.geocode(location, function(error, data){

        // on geocoder error, log and return
        if (error) {
            __logger.error("Error with geocoder api:");
            __logger.error(error);
            twilioHelpers.sendTwiml(res, ["Error with message body " + 
                location + ". (geocoding error response)"]);
            return;
        }

        // list of results
        var results = data.results;

        // if the results list is empty
        if (results.length == 0) {
            __logger.info("No geocoding results for " + location);

            twilioHelpers.sendTwiml(res, ["Location not found: " + location + 
                ". C'mon, stop trying to make our job so hard."]);

            return;
        }

        // TODO: handle multiple locations?
        var coords = results[0].geometry.location;

        // make sure the command is in the known list
        if (_.indexOf(supportedForecasts, command) >= 0) {
            // this gets the hourly blurb for a certain location
            dsClient.getForecasts(coords.lat, coords.lng, [command],
                function(error, body){

                if (error) {
                    __logger.error("Error with DarkSky API: ${error}");
                    twilioHelpers.sendTwiml(res, ["Error retrieving DarkSky \
                        forecast for " + location]);
                    return;
                }

                var resMessage = results[0].formatted_address + " ";

                resMessage += forecasts.getForecastString(body, command);

                twilioHelpers.sendTwiml(res, [resMessage]);
                return;

            });

        // if the command is not in the known list
        } else if (!command) {
            __logger.info("no command, assuming hourly");

            dsClient.getForecasts(coords.lat, coords.lng, ["hourly"],
                function(error, body){

                    if (error) {
                        __logger.error("Error with DarkSky API: ${error}");
                        twilioHelpers.sendTwiml(res, ["Error retrieving \
                            forecast for " + location]);
                        return;
                    }

                    var resMessage = results[0].formatted_address + " ";

                    resMessage += forecasts.getForecastString(body, "hourly");

                    twilioHelpers.sendTwiml(res, [resMessage]);
                    return;
                }

            )

        } else {
            __logger.info("invalid command %s", command);
            twilioHelpers.sendTwiml(res, ["Invalid command " + command]);
            return;
        }

    });

})

module.exports = router;
