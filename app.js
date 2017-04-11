"use strict";

var http = require("http"),
    express = require("express"),
    bodyparser = require("body-parser"),
    path = require('path'),

    cd = __dirname,
    webport = 3002,
    socketport = 3004,

    websock = require('socket.io')( socketport ),

    app = express();

var globalDataOptions = {
  "method": "GET",
  "hostname": "api.coinmarketcap.com",
  "port": null,
  "path": "/v1/global/",
  "headers": {
    "cache-control": "no-cache"
  }
};

var tickerDataOptions = {
  "method": "GET",
  "hostname": "api.coinmarketcap.com",
  "port": null,
  "path": "/v1/ticker/",
  "headers": {
    "cache-control": "no-cache"
  }
};

var globalData,
    tickerData,
    userRefreshRate = 7.5; //number of seconds before data updates are sent to the client

//listen for websocket connections
websock.on('connection', function(socket){

  //send initial data
  socket.emit('refreshTicker', tickerData);
  socket.emit('refreshGlobal', globalData);

  //ping the client to initiate the page
  socket.emit('init', globalData);

  //refresh the data every 'userRefreshRate' seconds
  var userRefreshTimer = setInterval(function() {
    socket.emit('refreshTicker', tickerData);
    socket.emit('refreshGlobal', globalData);
  }, userRefreshRate * 1000);

  socket.on('disconnect', function () {
    //Destroy the refresh timer for this user
    clearInterval(userRefreshTimer);
    userRefreshTimer = null;
  });
});

function getTickerData() {
  let cmcGET = new Promise(function(resolve, reject) {
    var request = http.request(tickerDataOptions, function(response) {
      var chunks = [];

      response.on("data", function(chunk) {
        chunks.push(chunk);
      });

      response.on("end", function() {
        var data = Buffer.concat(chunks);
        resolve(data.toString());
      });
    });

    request.on('error', (err) => {
      console.log('ERROR CONTACTING THE API! %s', err);
      reject(Error(err));
    });

    request.end();
  });

  cmcGET.then(function(data){
    if(data && data != 'undefined'){
      tickerData = data;
      return data;
    }
  }).catch(function(err){
    console.log(err);
    return 'There was an error! ' + err;
  });
}

function getGlobalData() {
  let cmcGET = new Promise(function(resolve, reject) {
    var request = http.request(globalDataOptions, function(response) {
      var chunks = [];

      response.on("data", function(chunk) {
        chunks.push(chunk);
      });

      response.on("end", function() {
        var data = Buffer.concat(chunks);
        resolve(data.toString());
      });
    });

    request.on('error', (err) => {
      console.log('ERROR CONTACTING THE API! %s', err);
      reject(Error(err));
    });

    request.end();
  });

  cmcGET.then(function(data){
    if(data && data != 'undefined'){
      globalData = data;
      return data;
    }
  }).catch(function(err){
    console.log(err);
    return 'There was an error! ' + err;
  });
}

//Get coin data on server start
getTickerData();
getGlobalData();

//Get coin data every minute - time will decrease at go-live
var autoRefresh = setInterval(function(){
  getTickerData();
  getGlobalData();
}, 15 * 1000);

/*    ROUTES    */
//application page
app.get('/', function(req, res){
  res.render('index');
});

//let's use a templating engine...
app.set('view engine', 'pug');
app.set('views', cd + '/views');

//oh yeah, we want our styles and scripts to be available, too...
app.use('/assets', express.static(cd + '/assets'));

//start the web server
app.listen(webport);
