// router for /message routes

var twilio = require("twilio");
var router = require("express").Router();
var geocoder = require("geocoder");
var _ = require("lodash");

var twilioHelpers = __include("helpers/twilio.js");
var darkSky = __include("helpers/dark-sky.js");
var dsClient = new darkSky.DarkSky(process.env.DARK_SKY_KEY);

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
    } else if (_.indexOf(["hourly"], messageBody[0]) >= 0) {
        // command is known
        var command = messageBody.shift();
        var location = messageBody.join(" ");

        // first word is the forecast type/command, the rest is the location info
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

        // first word is the forecast type/command, the rest is the location info
        var parsedMessage = {
            command: command.toLowerCase(),
            location: location.toLowerCase()
        }

        req.body.Body = parsedMessage;
        next();
    }
}

// convert an hourly forecast object to a string
function hourlyToString(hourlyList){
    var forecastString = "";
    hourlyList.forEach(function(element){
        forecastString += "\n";
        // get the timestamp and convert it to hour/minute
        var date = new Date(element.time*1000);
        forecastString += date.getHours().toString() + ":" + "00";
        forecastString += " - ";

        // now get the temp
        forecastString += "Temp ";
        forecastString += Math.round(element.temperature).toString();
        forecastString += "F. ";

        // get the conditions. 
        forecastString += element.summary;

        // if there's >5% rain, report it
        var chancePrecip = Math.round(element.precipProbability*100);

        if (chancePrecip >= 10){
            sendTwiml += "(";
            forecastString += chancePrecip;
            forecastString += "% ";
            forecastString += element.precipType + ")";
        }

    });

    return forecastString.slice(1);
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
        twilioHelpers.sendTwiml(res, ["No location body found (maybe this will be supported later, who knows"]);
        return;
    }

    // geocode the location
    geocoder.geocode(location, function(error, data){

        // on geocoder error, log and return
        if (error) {
            __logger.error("Error with geocoder api:");
            __logger.error(error);
            twilioHelpers.sendTwiml(res, ["Error with message body " + location + ". (geocoding error response)"]);
            return;
        }

        // list of results
        var results = data.results;

        // if the results list is empty
        if (results.length == 0) {
            __logger.info("No geocoding results for " + location);
            twilioHelpers.sendTwiml(res, ["Location not found: " + location + ". C'mon, stop trying to make our job so hard."]);
            return;
        }

        var coords = results[0].geometry.location;

        if (command == "hourly") {
            // this gets the hourly blurb for a certain location
            dsClient.getForecasts(coords.lat, coords.lng, ["hourly"], function(error, body){

                if (error) {
                    __logger.error("Error with DarkSky API: ${error}");
                    twilioHelpers.sendTwiml(res, ["Error retrieving DarkSky forecast for " + location]);
                    return;
                }

                var hourlyData = body.hourly.data;
                var ouboundMessage = results[0].formatted_address + " hourly:\n";

                ouboundMessage += hourlyToString(hourlyData.slice(0,6));

                twilioHelpers.sendTwiml(res, [ouboundMessage]);
                return;

            });
        } else {
            __logger.info("invalid command %s", command);
            twilioHelpers.sendTwiml(res, ["Invalid command " + command]);
            return;
        }

    });

})

module.exports = router;