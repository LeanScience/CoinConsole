"use strict";

var QueryString = function() {
 // This function is anonymous, is executed immediately and
 // the return value is assigned to QueryString!
 var query_string = {};
 //window.location.search for "?x=y" url params -- this requires us to refresh the page when changed, though
 var query = window.location.hash.substring(1);
 var vars = query.split("&");
 for (var i=0;i<vars.length;i++) {
   var pair = vars[i].split("=");
       // If first entry with this name
   if (typeof query_string[pair[0]] === "undefined") {
     query_string[pair[0]] = decodeURIComponent(pair[1]);
       // If second entry with this name
   } else if (typeof query_string[pair[0]] === "string") {
     var arr = [ query_string[pair[0]],decodeURIComponent(pair[1]) ];
     query_string[pair[0]] = arr;
       // If third or later entry with this name
   } else {
     query_string[pair[0]].push(decodeURIComponent(pair[1]));
   }
 }
 return query_string;
}();

var websocketPort = 3004;

var information = document.getElementById('information'),
    filterbar = document.getElementById('filterbar'),
    filter = document.getElementById('filter'),

    numberOfCurrencies = document.getElementById('total-currencies'),
    totalMarketCap = document.getElementById('total-market-cap'),
    totalTradeVolume = document.getElementById('total-volume'),
    bitcoinDominance = document.getElementById('btc-dominance'),

    welcomeMessage = '<div class="get-started"><h2>Click a button on the filter to select which currencies you want to display on your dashboard.</h2></div>';

//connect to the websocket server on page load
var socket = io.connect('//' + window.location.hostname + ':' + websocketPort),
    globalData,
    tickerData;

//initiate the page
socket.on('init', function(){
  createFilterList(tickerData); //create the new list of coins for the filter
});

//listen for refreshed data
socket.on('refreshGlobal', function(data){
  globalData = JSON.parse(data);

  updateGlobal(globalData);
});

socket.on('refreshTicker', function(data){
  tickerData = JSON.parse(data);

  updateInformation(displayList);
});

function updateGlobal(o){
  numberOfCurrencies.innerHTML = o.active_currencies + " Active Currencies";
  totalMarketCap.innerHTML = "$" + o.total_market_cap_usd.formatMoney(0, ".", ",") + " Market Cap";
  totalTradeVolume.innerHTML = "$" + o.total_24h_volume_usd.formatMoney(0, ".", ",") + " Trade Volume";
  bitcoinDominance.innerHTML = o.bitcoin_percentage_of_market_cap + "% Bitcoin Dominance";
}

//set up a function to create the filter list
function createFilterList(a){
  filter.innerHTML = '';

  var result = new Promise(function(resolve, reject){
    var html = '';
    for (var coin in a) {
      if (a[coin].symbol) {
        var coinName = a[coin].symbol;
        html = html + createFilterItem(coinName);
      }
    }
    resolve(html);
  });

  result.then(function(filterList){
    filter.innerHTML = filterList;

    //check for active coins and style them
    //this is a future issue
  });
}

function activeCheck(s){
  searchArray(displayList, s).then(function(result){
    for (var coin in tickerData){

    }
  });
}

function filterSearch(term){
  if (term == ''){
    //reset the filter if the search term is empty
    createFilterList(tickerData);
  } else {
    //search the available coins for the term and rerender the filter
    searchArray(tickerData, term, "name").then(function(resultName){
      searchArray(tickerData, term, "symbol").then(function(resultSymbol){
        var results = resultName.concat(resultSymbol).unique();
        createFilterList(results);
      });
    });
  }
}

function clearSearch(e){
  if (document.getElementById(e)) {
    document.getElementById(e).value = '';
    createFilterList(tickerData);
  }
}

function searchArray(a, t, k, lt){
  return new Promise(function(resolve, reject){
    if (k) {
      if (typeof t === 'string') {
        resolve(a.filter(function(element) {
          return element[k].toString().toLowerCase().indexOf(t.toLowerCase()) > -1;
        }));
      } else {
        if (lt == true) {
          resolve(a.filter(function(element) {
            return element[k] <= t;
          }));
        } else {
          resolve(a.filter(function(element) {
            return element[k] >= t;
          }));
        }
      }
    } else {
      if (typeof t === 'string') {
        resolve(a.filter(function(element) {
          return element.toString().toLowerCase().indexOf(t.toLowerCase()) > -1;
        }));
      } else {
        if (lt == true) {
          resolve(a.filter(function(element) {
            return element <= t;
          }));
        } else {
          resolve(a.filter(function(element) {
            return element >= t;
          }));
        }
      }
    }
  });
}

//make a filter checkbox
function createFilterItem(s){
  var result = '<li class="no-margin no-dot btn btn-blue" onClick="toggleCoin(this.innerHTML.toLowerCase())">' + s + '</li>';

  return result;
}

//toggle the filter list
var toggled = false; //default is toggled

toggleFilter();

function toggleFilter() {
  if (toggled == false) {
    //show the filter
    filterbar.style.display = "flex";
    toggled = true;
    document.getElementById('filter-toggle-icon').className = "fa fa-angle-left";
    checkToggleFilterPosition();
  } else if (toggled == true) {
    //hide the filter
    filterbar.style.display = "none";
    toggled = false;
    document.getElementById('filter-toggle-icon').className = "fa fa-angle-right";
    checkToggleFilterPosition();
  }
}

function checkToggleFilterPosition() {
  var filterToggleIcon = document.getElementById('filter-toggle-icon');

  if (window.innerWidth <= 768) {
    if (filterToggleIcon.className === "fa fa-angle-right") {
      document.getElementById('filter-toggle-icon').className = "fa fa-angle-down";
    } else if (filterToggleIcon.className === "fa fa-angle-left") {
      document.getElementById('filter-toggle-icon').className = "fa fa-angle-up";
    }
  } else {
    if (filterToggleIcon.className === "fa fa-angle-up") {
      document.getElementById('filter-toggle-icon').className = "fa fa-angle-left";
    } else if (filterToggleIcon.className === "fa fa-angle-down") {
      document.getElementById('filter-toggle-icon').className = "fa fa-angle-right";
    }
  }
}

window.onresize = checkToggleFilterPosition;

//toggle coin data on and off
var displayList;

function getUrlDisplayList() {
  if (QueryString.display) {
    displayList = QueryString.display.toLowerCase().split(",");
  } else {
    displayList = [];
  }
}

getUrlDisplayList();

function toggleTop(){
  toggleReset();
  searchArray(tickerData, 200, "rank", true)
  .then(function(topTwoHundredData){
    for (var coin in topTwoHundredData) {
      if (topTwoHundredData[coin].symbol) {
        displayList.push(topTwoHundredData[coin].symbol);
      }
    }
  }).then(function(){
    updateInformation(displayList);
    window.location.search = window.location.search;
  });
}

function toggleReset(){
  displayList = [];
  updateInformation(displayList);
}

function toggleCoin(coin){
  //check if the coin is currently on the display
  searchArray(displayList, coin).then(function(result){
    if (result == false) {
      //if it's not, add it and rerender
      displayList.push(coin);
      updateInformation(displayList);
    } else {
      //if it is, remove it and rerender
      var index = displayList.indexOf(coin);
      displayList.splice(index, 1);
      updateInformation(displayList);
    }
  });
}

function updateURL(a){
  if (a && a.length && a.length > 0) {
    //create the new string
    var newParams = a.toString().toLowerCase();
    //put it up in the URL bar
    window.history.replaceState(newParams, newParams, "/#display=" + newParams);
  } else {
    //if there aren't any coins being displayed, the url should be set to root
    window.history.replaceState("", "initial page", "/");
  }
}

function updateInformation(a){
  updateURL(a);

  if (a.length != 0){
    var result = new Promise(function(resolve, reject){
      var html = '',
      asyncLoop = 0;
      for (var coin in a) {
        selectCoinInfo(a[coin]).then(function(coinInfo){
          createInformationList(coinInfo).then(function(informationList){
            asyncLoop += 1;
            html = html + informationList;
            if (asyncLoop == a.length) resolve(html);
          })
          .then(Sortable.create(information));
        });
      }
    });

    result.then(function(informationList){
      information.innerHTML = informationList;
    });
  } else {
    information.innerHTML = welcomeMessage;
  }
}

function selectCoinInfo(coin) {
  return new Promise(function(resolve, reject){
    for (var index in tickerData) {
      if (tickerData[index].symbol && tickerData[index].symbol !== "undefined" && typeof tickerData[index].symbol === 'string' && tickerData[index].symbol.toLowerCase() === coin){
        resolve(tickerData[index]);
        break;
      }
    }
  });
}

function createInformationList(o){
  return new Promise(function(resolve, reject){
    if (o.name) {
      var title = o.name,
          priceUsd = parseFloat(o.price_usd),
          priceUsd = ((priceUsd > 1) ? priceUsd.formatMoney(2, ".", ",") : priceUsd = priceUsd.formatMoney(8, ".", ",")),
          priceBtc = parseFloat(o.price_btc).toFixed(8),
          volume = parseFloat(o["24h_volume_usd"]).formatMoney(0, ".", ","),
          marketCap = parseFloat(o.market_cap_usd).formatMoney(0, ".", ","),
          oneHour = parseFloat(o["percent_change_1h"]),
          twentyFourHour = parseFloat(o["percent_change_24h"]),
          sevenDay = parseFloat(o["percent_change_7d"]),
          rank = parseInt(o.rank);

      var oneHourChangeHTML = ((oneHour < 0) ? '<h4 class="no-margin one-hour negative">1H: ' + oneHour + "%</h4>" : '<h4 class="no-margin one-hour positive">1H: ' + oneHour + '%</h4>'),
          twentyFourHourChangeHTML = ((twentyFourHour < 0) ? '<h4 class="no-margin twenty-four-hour negative" style="padding: 0 7px;">24H: ' + twentyFourHour + '%</h4>' : '<h4 class="no-margin twenty-four-hour positive" style="padding: 0 7px;">24H: ' + twentyFourHour + '%</h4>'),
          sevenDayChangeHTML = ((sevenDay < 0) ? '<h4 class="no-margin seven-day negative">7D: ' + sevenDay + '%</h4></div>' : "<h4 class='no-margin seven-day positive'>7D: " + sevenDay + '%</h4>');

      var titleHTML = '<h3 class="no-margin">' + title + '<small class="rank"> #' + rank + '</small>' + '</h3>',
          priceUsdHTML = '<h4 class="no-margin">USD: $' + priceUsd + '</h4>',
          priceBtcHTML = '<h4 class="no-margin">BTC: ' + priceBtc + '</h4>',
          volumeHTML = '<h4 class="no-margin">Volume: $' + volume + '</h4>',
          marketCapHTML = '<h4 class="no-margin">Market Cap: $' + marketCap + '</h4>',
          result = '<li class="inline information-item"><div id=' + title + '">' + titleHTML + priceUsdHTML + priceBtcHTML + volumeHTML + marketCapHTML + '<div class="percent-changes no-padding">' + oneHourChangeHTML + twentyFourHourChangeHTML + sevenDayChangeHTML + '</div>' + '</div></li>';

      resolve(result);
    }
  });
}

function shareLink(){
  //future button function to share a link to that specific coinconsole
  //maybe some url shortening could be added to this function to make it... well... shorter
}

Number.prototype.formatMoney = function(c, d, t){
  var n = this,
      c = isNaN(c = Math.abs(c)) ? 2 : c,
      d = d == undefined ? "." : d,
      t = t == undefined ? "," : t,
      s = n < 0 ? "-" : "",
      i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
      j = (j = i.length) > 3 ? j % 3 : 0;
     return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};

Array.prototype.unique = function() {
    return this.reduce(function(accum, current) {
        if (accum.indexOf(current) < 0) {
            accum.push(current);
        }
        return accum;
    }, []);
}
