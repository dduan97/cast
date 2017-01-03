var client = require("twilio")(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
var twilio = require("twilio");

// // callback should take in <error> and <responseData>
// // <responseData>: a JavaScript object containing data received from Twilio.
// // A sample response from sending an SMS message is here (click "JSON" to see how the data appears in JavaScript):
// // http://www.twilio.com/docs/api/rest/sending-sms#example-1
// module.exports.send_sms = function(number, message, callback){
//     var message_details = {
//         to: number,
//         from: "+18482063592",
//         body: message
//     };

//     client.sendMessage(message_details, callback);
// }

// function to send one TwiML responses
// <res> should be the response object from the hook
// <msgs> should be a list of strings corresponding to the list of message 
// verbs wanted in the response
module.exports.send_twiml = function(res, msgs){
    var resp = new twilio.TwimlResponse();

    msgs.forEach(function(element){
        resp.message(element);
    });

    __logger.info("responding with %s", resp.toString());

    res.writeHead(200, {'Content-Type': 'text/xml'});
    res.end(resp.toString());
}

module.exports.twilio = client;