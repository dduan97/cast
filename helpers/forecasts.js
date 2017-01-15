// forecast.js
// provides function a function to convert DarkSky response objects to strings

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
function hourlyToString(hourly, offset){

    __logger.debug("getting hourly string");

    if (!hourly) {
        return "Hourly forecast not available for the location you provided";
    }

    var hourlyList = hourly.data;
    var forecastString = "hourly: ";

    // get the hourly for the first 6 entries
    hourlyList.slice(0,6).forEach(function(element){
        forecastString += "\n";
        // get the timestamp and convert it to hour/minute
        var date = new Date(element.time*1000 + offset*60*60*1000);
        forecastString += date.getUTCHours().toString();
        forecastString += ":" + "00";
        forecastString += " - ";

        // now get the temp
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

// dailyToString(<daily>)
// does the same as hourly but with daily
function dailyToString(daily, offset){

    __logger.debug("getting daily string");

    if (!daily) {
        return "Daily forecast not available for the location you provided";
    }

    var dailyList = daily.data;
    var forecastString = "5-day: ";

    // get the daily for the next 5 days
    dailyList.slice(0,5).forEach(function(element){
        forecastString += "\n";
        // get the timestamp and get the date (kinda hacky)
        var date = new Date(element.time*1000 + offset*60*60*1000);
        forecastString += date.getUTCDayOfWeek();
        forecastString += " - ";

        // now get the temp
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

function currentlyToString(currently, offset){
    __logger.debug("getting currently string");

    if (!currently) {
        return "Current conditions not available for the location you provided";
    }

    // get this local date object nonsense
    var date = new Date(currently.time*1000 + offset*60*60*1000);

    var forecastString = "currently (";
    forecastString += date.getUTCHours() + ":";
    forecastString += ("0" + date.getUTCMinutes()).slice(-2);
    forecastString += "):\n";

    // put in the temp, conditions, chance precip, and wind
    forecastString += Math.round(currently.temperature);
    forecastString += "F.\n";
    forecastString += currently.summary;

    // get the chance rain
    var chancePrecip = Math.round(currently.precipProbability*100);

    if (chancePrecip >= 10) {
        forecastString += "(";
        forecastString += chancePrecip.toString();
        forecastString += "% ";
        forecastString += currently.precipType;
        forecastString += ").";
    }

    // now get the wind
    forecastString += "\nWind ";
    forecastString += Math.round(currently.windSpeed);
    forecastString += " MPH."

    return forecastString;
}

// minutelyToString(<minutely>, <offset>)
// <minutely>: minutely object from DarkSky API
// <offset>: number of hours offset from UTC
// returns a stringified within-the-hour forecast
function minutelyToString(minutely, offset){
    __logger.info("getting minutely string");

    if (!minutely) {
        return "Minutely forecast not available for the location you provided";
    }

    // TODO: make an actual forecast
    return "minutely forecast: \n" + minutely.summary;
}

// takes in a DarkSky API response <dsResponse> and a forecast type string
// <forecast>
// and stringifies the forecast in the response
function getForecastString(dsResponse, forecastType){

    if (!dsResponse) {
        return "Error: empty DarkSky response body";
    }

    var timeOffset = dsResponse.offset;

    // basically just hand it off to the separate helper functions
    switch (forecastType) {

        case "hourly":
            return hourlyToString(dsResponse.hourly, timeOffset);

        case "daily":
            return dailyToString(dsResponse.daily, timeOffset);

        case "currently":
            return currentlyToString(dsResponse.currently, timeOffset);

        case "minutely":
            return minutelyToString(dsResponse.minutely, timeOffset);

        default:
            return "Forecast not supported: " + forecastType;
    }
}

module.exports.getForecastString = getForecastString;