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
websock.on('connection', onConnect);

function onConnect(socket){
  var badAttempt = 0,
      messageAttempt = 0,
      banned = false,

      clearMessageAttemptTimer = 10; //number of seconds before the message count is reset

  var messageAttemptTimer = setInterval(function(){
    messageAttempt = 0;
  }, clearMessageAttemptTimer * 1000);

  socket.join('trollbox');
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

  socket.on('trollbox', function(data){
    if (! socket.nickname){
      ((data.name) ? socket.nickname = data.name : socket.nickname = "Anonymous");
    }

    if (data.message.length < 200 && messageAttempt < 10 && ! banned){
      messageAttempt += 1;
      filterBadWords(data.message).then(function(filteredMessage){
        data.message = filteredMessage;
        websock.to('trollbox').emit('trollbox', {"message": data.message, "name": socket.nickname});
      });
    } else {
      socket.emit('trollbox', {"name": "CoinConsole", "message": "Nice try. Keep the trolling short and sweet."});
      badAttempt += 1;
      checkBadAttempts();
    }
  });

  socket.on('disconnect', function() {
    //Destroy the refresh timer for this user
    clearInterval(userRefreshTimer);
    clearInterval(messageAttemptTimer);
    userRefreshTimer = null;
    messageAttemptTimer = null;
  });

  function filterBadWords(s){
    return new Promise(function(resolve, reject){
      var badWords = ["fuck", "bastard", "cum", "cunt", "cock", "ass", "shit", "bitch"],
          rgx = new RegExp(badWords.join("|"), "gi");

      resolve(s.replace(rgx, "****"));
    });
  }

  function checkBadAttempts(){
    if (badAttempt >= 10) {
      socket.emit('trollbox', {"name": "CoinConsole", "message": "You've been banned from the trollbox."});
      ban();
    }
  }

  function ban(){
    socket.leave('trollbox');
    banned = true;
  }
}

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
