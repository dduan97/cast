var client = require("twilio")(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

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

module.exports = client;