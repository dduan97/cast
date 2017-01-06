// router for /message routes

var twilio = require("twilio");
var router = require("express").Router();
var geocoder = require("geocoder");
var _ = require("lodash");

var twilioHelpers = __include("helpers/twilio.js");
var darkSky = __include("helpers/dark-sky.js");
var dsClient = new darkSky.DarkSky(process.env.DARK_SKY_KEY);

// a list of supported forecasts
var supportedForecasts = ["currently",
                            "minutely",
                            "daily",
                            "alerts",
                            "flags",
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

// hourlyToString:
// takes in a hourly forecast list and time offset and converts forecast to a 
// string
//
// example:
//      [{
//          "time": 1483678800,
//          "summary": "Clear",
//          "precipProbability": 0,
//          "temperature": 42.94,
//      },
//      {
//          "time": 1483682400,
//          "summary": "Drizzle",
//          "precipType": "rain",
//          "precipProbability": 0.30,
//          "temperature": 41.72,
//      }]
// => "13:00 - Temp 43F. Clear\n14:00 - Temp 42F. Drizzle(30% rain)"
function hourlyToString(hourlyList, offset){

    __logger.debug("getting hourly string");

    var forecastString = "hourly: ";

    // get the hourly for the first 6 entries
    hourlyList.slice(0,6).forEach(function(element){
        forecastString += "\n";
        // get the timestamp and convert it to hour/minute
        var date = new Date(element.time*1000);
        forecastString += (date.getUTCHours() + offset).toString();
        forecastString += ":" + "00";
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
            forecastString += "(";
            forecastString += chancePrecip;
            forecastString += "% ";
            forecastString += element.precipType + ")";
        }

    });

    return forecastString;
}

// dailyToString(<dailyList>)
// does the same as hourly but with daily
function dailyToString(dailyList, offset){

    __logger.debug("getting daily string");

    var forecastString = "5-day: ";

    // get the daily for the next 5 days
    dailyList.slice(0,5).forEach(function(element){
        forecastString += "\n";
        // get the timestamp and get the date (kinda hacky)
        var date = new Date(element.time*1000 - offset*60*60*100);
        forecastString += date.getUTCDayOfWeek();
        forecastString += " - ";

        // now get the temp
        forecastString += "Temp ";
        forecastString += Math.round(element.temperatureMin).toString();
        forecastString += "F-";
        forecastString += Math.round(element.temperatureMax).toString();
        forecastString += "F. ";

        // get the conditions. 
        forecastString += element.summary;

        // if there's >5% rain, report it
        var chancePrecip = Math.round(element.precipProbability*100);

        if (chancePrecip >= 10){
            forecastString += "(";
            forecastString += chancePrecip;
            forecastString += "% ";
            forecastString += element.precipType + ")";
        }

    });

    return forecastString;
}

// takes in a DarkSky API response <dsResponse> and a forecast type string
// <forecast>
// and stringifies the forecast in the response
function getForecastString(dsResponse, forecastType){

    var timeOffset = dsResponse.offset;

    // basically just hand it off to the separate helper functions
    switch (forecastType) {

        case "hourly":
            return hourlyToString(dsResponse.hourly.data, timeOffset);

        case "daily":
            return dailyToString(dsResponse.daily.data, timeOffset);
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

                resMessage += getForecastString(body, command);

                twilioHelpers.sendTwiml(res, [resMessage]);
                return;

            });

        // if the command is not in the known list
        } else {
            __logger.info("invalid command %s", command);
            twilioHelpers.sendTwiml(res, ["Invalid command " + command]);
            return;
        }

    });

})

module.exports = router;