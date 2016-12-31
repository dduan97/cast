// helper to interact with the dark sky api
var https_request = __include("helpers/https-request.js");

function DarkSky(key){
    this.key = key;
    this.host = "https://api.darksky.net";
    this.path = "/forecast/" + key.toString() + "/";
}

DarkSky.prototype.get_hourly = function(lat, long, callback){
    var exclusions = ["currently", "minutely", "daily", "alerts", "flags"];
    var req_path = this.path + lat + "," + long + "/";
    req_path += "?exclude=" + exclusions.join(",");
    __logger.verbose("DarkSky: preparing GET request to %s", this.host + req_path);

    // now we make the get request to the api
    https_request.get(this.host + req_path, function(body){
        callback(body);
    });
}

module.exports.DarkSky = DarkSky;