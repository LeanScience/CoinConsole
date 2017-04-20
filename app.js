"use strict";

var http = require("http"),
    express = require("express"),
    bodyparser = require("body-parser"),
    path = require('path'),

    cd = __dirname,
    webport = 8080,
    socketport = 3004,

    websock = require('socket.io')( socketport ),

    app = express();

/*    DATA      */
var globalDataOptions = {
      "method": "GET",
      "hostname": "api.coinmarketcap.com",
      "port": null,
      "path": "/v1/global/",
      "headers": {
        "cache-control": "no-cache"
      }
    },
    tickerDataOptions = {
      "method": "GET",
      "hostname": "api.coinmarketcap.com",
      "port": null,
      "path": "/v1/ticker/",
      "headers": {
        "cache-control": "no-cache"
      }
    };

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
var tickerData = getTickerData(),
    globalData = getGlobalData();

//Get coin data every 15 seconds
var autoRefresh = setInterval(function(){
  tickerData = getTickerData();
  globalData = getGlobalData();
}, 15 * 1000);

/*    GENERAL   */
//let's use a templating engine...
app.set('view engine', 'pug');
app.set('views', cd + '/views');

//oh yeah, we want our styles and scripts to be available, too...
app.use('/assets', express.static(cd + '/assets'));

//set the routes...
var routes = require('./modules/routes');
app.use(routes);

//start the web server
app.listen(webport);

//listen for websocket client connections
websock.on('connection', onConnect);

function onConnect(socket){
  var userRefreshRate = 7.5; //number of seconds before data updates are sent to the client

  //send initial data
  socket.emit('refreshTicker', tickerData);
  socket.emit('refreshGlobal', globalData);

  //ping the client to initiate the page
  socket.emit('init', tickerData);

  //refresh the data every 'userRefreshRate' seconds
  var userRefreshTimer = setInterval(function() {
    socket.emit('refreshTicker', tickerData);
    socket.emit('refreshGlobal', globalData);
  }, userRefreshRate * 1000);

  socket.on('disconnect', function() {
    //Destroy the refresh timer for this user
    clearInterval(userRefreshTimer);
    clearInterval(messageAttemptTimer);
    userRefreshTimer = null;
    messageAttemptTimer = null;
  });

  /*   Trollbox functions   */
  var badAttempt = 0,
      messageAttempt = 0,
      banned = false,

      clearMessageAttemptTimer = 10; //number of seconds before the message count is reset

  var messageAttemptTimer = setInterval(function(){
    messageAttempt = 0;
  }, clearMessageAttemptTimer * 1000);

  socket.join('trollbox');

  socket.on('trollbox', function(data){
    if (! socket.nickname){
      ((data.name && data.name.length <= 16) ? filterBadWords(data.name).then(function(filteredName){socket.nickname = filteredName}) : socket.nickname = "anonymous");
    }

    if (data.message.length < 200 && data.message.length > 0 && messageAttempt <= 3 && ! banned){
      messageAttempt += 1;
      filterBadWords(data.message).then(function(filteredMessage){
        data.message = filteredMessage;
        websock.to('trollbox').emit('trollbox', {"message": data.message, "name": socket.nickname});
      });
    } else {
      if (!banned){
        socket.emit('trollbox', {"name": "CoinConsole", "message": "Nice try. Keep the trolling short and sweet."});
        badAttempt += 1;
        checkBadAttempts();
      } else {
        socket.emit('trollbox', {"name": "CoinConsole", "message": "You've been banned from the trollbox."});
      }
    }
  });

  function filterBadWords(s){
    return new Promise(function(resolve, reject){
      var badWords = ["fuck", "bastard", "cum", "cunt", "cock", "ass", "shit", "bitch"], //require('./modules/badwords')
          rgx = new RegExp(badWords.join("|"), "gi");

      resolve(s.replace(rgx, "****"));
    });
  }

  function checkBadAttempts(){
    if (badAttempt >= 10) {
      ban();
    }
  }

  function ban(){
    socket.leave('trollbox');
    banned = true;
  }
}
