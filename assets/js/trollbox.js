//UI Implementation
var tb = document.getElementById('trollbox'),
    tbTitle = trollbox.querySelector('.title'),
    tbChat = trollbox.querySelector('.chat'),
    tbInput = trollbox.querySelector('.input'),
    tbSubmit = trollbox.querySelector('.submit'),

    tbWelcome = "Enter a nickname to start trolling.";
tbChat.innerHTML = tbWelcome;

tbInput.addEventListener('keypress', function (e) {
    var key = e.which || e.keyCode;
    ((key === 13) ? trollboxSubmit() : key);
});

var tbNickname,
    messages = [];

function trollboxSubmit(){
  if (! tbNickname) {
    if (! tbInput.value == '') {
      setNickname(tbInput.value);
      tbInput.placeholder = "Enter a message...";
      tbInput.value = '';
    }
  } else {
    sendChat(tbInput.value, tbNickname);
    tbInput.value = '';
  }
}

function setNickname(s){
  tbNickname = s;
  appendNickToTitle();
}

function appendNickToTitle() {
  tbTitle.innerHTML = tbTitle.innerHTML + "<small> Trolling as " + tbNickname;
}

function displayMessages(a){
  truncateMessages(75, a).then(function(truncatedMessages){
    tbChat.innerHTML = '';
    for (message in truncatedMessages) {
      ((typeof truncatedMessages[message] === "string") ? appendMessage(truncatedMessages[message]) : truncatedMessages[message]);
    }
  });
}

function appendMessage(s) {
  tbChat.innerHTML = tbChat.innerHTML + '<p class="no-margin">' + s + '</p>';
}

function truncateMessages(i, a){
  return new Promise(function(resolve, reject){
    a.splice(0, (a.length - i));
    resolve(a);
  });
}

var tbToggle = false;

toggleTrollbox();

function toggleTrollbox() {
  if (tbToggle == false) {
    //show the filter
    tb.style.bottom = "-440px";
		tb.style.right = "350px";
    tbToggle = true;
  } else if (tbToggle == true) {
    //hide the filter
		tb.style.bottom = "0px";
		tb.style.right = "350px";
    tbToggle = false;
  }
}

//Functionality

socket.on('trollbox', function(data){
  var fullMessage = data.name + ": " + data.message;
  messages.push(fullMessage);
  displayMessages(messages);
});

function sendChat(message, nickname){
  if (message.length < 200){
    socket.emit('trollbox', {"name": nickname, "message": message});
  } else {
    console.log("Your message was too long! Please keep it under 200 characters.");
  }
}
