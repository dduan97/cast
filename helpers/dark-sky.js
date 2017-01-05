// dark-sky.js: a helper to interact with the dark sky api

var _ = require("lodash");

var httpsRequest = __include("helpers/https-request.js");

function DarkSky(key){
    this.key = key;
    this.host = "https://api.darksky.net";
    this.path = "/forecast/" + key.toString() + "/";
}

// DarkSky.get_hourly
// <lat> and <long> are stringified latitude and longitude
// <forecasts> is an array which must be a subset of 
// 		["currently", "minutely", "daily", "alerts", "flags"]
// <callback> will be called with params error and body
// will return a json object containing the requested forecasts
DarkSky.prototype.getForecasts = function(lat, long, forecasts, callback){

	// remove duplicates from the forecasts array
	var fc = _.uniq(forecasts);

    var allForecasts = ["currently", "minutely", "daily", "alerts", "flags", "hourly"];
	// check to see if there is an unknown request
	var differences = _.difference(fc, allForecasts);

	if (differences.length) {
		return callback("Unrecognized commands " + differences.toString());
	}

	// now generate the exclusions
    var exclusions = _.difference(allForecasts, fc);
    var reqPath = this.path + lat + "," + long + "/";
    reqPath += "?exclude=" + exclusions.join(",");
    __logger.verbose("DarkSky: preparing GET request to %s", this.host + reqPath);

    // now we make the get request to the api
    httpsRequest.get(this.host + reqPath, callback);
}

// DarkSky.get_daily
// <lat> and <long> are stringified latitude and longitude
// <callback> will be called iwth params error and body

module.exports.DarkSky = DarkSky;