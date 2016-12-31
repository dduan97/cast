// helper to make https requests
var https = require("https");

// callback should take in <error>, <json body>
module.exports.get = function(url, callback){
    return https.get(url, function(response) {
        // Continuously update stream with data
        var body = '';

        response.on('data', function(d) {
            body += d;
        });

        response.on('end', function() {
            // Data reception is done, do whatever with it!
            var parsed = JSON.parse(body);
            callback(null, parsed);
        });
    }).on('error', function(error){
        callback(error);
    });
}