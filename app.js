// __base_dir gives the project's home directory
global.__base_dir = __dirname;

// __abs_path() converts relative path (from project home) to absolute paths
global.__abs_path = function(path) {
  return __base_dir + path;
}

// require()'s <file> (which is a relative path from project home)
// nice cause can be used anywhere without regards to the calling file's
// location
global.__include = function(file) {
    return require(__abs_path("/" + file));
}

// set up a global winston logger instance
global.__logger = __include("helpers/logger.js");

var express = require("express");
var https = require("https");
var body_parser = require("body-parser");

const PORT = 2180;

// create the application
var app = express();

app.use(body_parser.json());    // middleware to parse body
app.use(function(req, res, next){   // middleware to log request
    __logger.info("%s: %s", req.method, req.originalUrl);
    next();
})

// test route
app.get("/", function(req, res){
    res.send("hello!");
})

// /messages
app.use("/messages", __include("controllers/messages.js"))

app.listen(PORT, function(){
    __logger.info("Server listening on http://localhost:%s", PORT);
});

// //Create a server
// var server = https.createServer(app);

// // start the server
// server.listen(PORT, function(){
//     __logger.info("Server listening on: http://localhost:%s", PORT);
// });