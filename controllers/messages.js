// router for /message routes

var twilio = require("twilio");
var router = require("express").Router();
var geocoder = require("geocoder");
var _ = require("lodash");

var twilio_helpers = __include("helpers/twilio.js");
var dark_sky = __include("helpers/dark-sky.js");
var ds_client = new dark_sky.DarkSky(process.env.DARK_SKY_KEY);

// middleware to parse our message body
function parse_incoming_message(req, res, next){
    // get the request message body, split by word
    var message_body = req.body.Body.match(/\S+/g);
    message_body = message_body.map((e) => e.toLowerCase());

    // if the body is empty
    if (message_body.length == 0) {
        req.body.Body = {
            command: "",
            location: ""
        }
        next();
    } else if (_.indexOf(["hourly"], message_body[0]) >= 0) {
        // command is known
        var command = message_body.shift();
        var location = message_body.join(" ");

        // first word is the forecast type/command, the rest is the location info
        var parsed_message = {
            command: command,
            location: location
        }

        req.body.Body = parsed_message;
        next();
    } else {
        // command is unknown and probably a bad request
        var command = "";
        var location = message_body.join(" ");

        // first word is the forecast type/command, the rest is the location info
        var parsed_message = {
            command: command.toLowerCase(),
            location: location.toLowerCase()
        }

        req.body.Body = parsed_message;
        next();
    }
}

// convert an hourly forecast object to a string
function hourly_forecast_to_string(hourly_list){
    var forecast_string = "";
    hourly_list.forEach(function(element){
        forecast_string += "\n";
        // get the timestamp and convert it to hour/minute
        var date = new Date(element.time*1000);
        forecast_string += date.getHours().toString() + ":" + "00";
        forecast_string += " - ";

        // now get the temp
        forecast_string += "Temp ";
        forecast_string += Math.round(element.temperature).toString();
        forecast_string += "F. ";

        // get the conditions. 
        forecast_string += element.summary;

        // if there's >5% rain, report it
        var chance_precip = Math.round(element.precipProbability*100);

        if (chance_precip >= 10){
            forecast_string += "(";
            forecast_string += chance_precip;
            forecast_string += "% ";
            forecast_string += element.precipType + ")";
        }

    });

    return forecast_string.slice(1);
}


// handles POST to /message/
// Twilio will POST here for an incoming message
router.post("/", parse_incoming_message, function(req, res){

    __logger.info("printing request");
    console.log(req.body);

    // get the command and the location
    var command = req.body.Body.command;
    var location = req.body.Body.location;

    // if there is no location
    if (!location) {
        __logger.info("no location in the body");
        twilio_helpers.send_twiml(res, ["No location body found (maybe this will be supported later, who knows"]);
        return;
    }

    // geocode the location
    geocoder.geocode(location, function(error, data){

        // on geocoder error, log and return
        if (error) {
            __logger.error("Error with geocoder api:");
            __logger.error(error);
            twilio_helpers.send_twiml(res, ["Error with message body " + location + ". (geocoding error response)"]);
            return;
        }

        // list of results
        var results = data.results;

        // if the results list is empty
        if (results.length == 0) {
            __logger.info("No geocoding results for " + location);
            twilio_helpers.send_twiml(res, ["Location not found: " + location + ". C'mon, stop trying to make our job so hard."]);
            return;
        }

        var coords = results[0].geometry.location;

        if (command == "hourly") {
            // this gets the hourly blurb for a certain location
            ds_client.getForecasts(coords.lat, coords.lng, ["hourly"], function(error, body){

                if (error) {
                    __logger.error("Error with DarkSky API: ${error}");
                    twilio_helpers.send_twiml(res, ["Error retrieving DarkSky forecast for " + location]);
                    return;
                }

                var hourly_data = body.hourly.data;
                var outbound_msg = results[0].formatted_address + " hourly:\n";

                outbound_msg += hourly_forecast_to_string(hourly_data.slice(0,6));

                twilio_helpers.send_twiml(res, [outbound_msg]);
                return;

            });
        } else {
            __logger.info("invalid command %s", command);
            twilio_helpers.send_twiml(res, ["Invalid command " + command]);
            return;
        }

    });

})

module.exports = router;