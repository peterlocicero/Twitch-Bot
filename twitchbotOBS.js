const tmi = require('tmi.js');
const fs=require('fs');
var listObj = require('./dir/eligible.js');
var doWork = true;

// Define configuration options

//obs configuration
const OBSWebSocket = require('obs-websocket-js');
const obs = new OBSWebSocket();

//streamlabs configuration
//To make it easier to view, would be better to include API keys and other configuration in an .env file
const io = require('socket.io-client');
const socketToken = 'INSERT STREAMLABS API KEY HERE'; //Socket token from /socket/token end point

//twitch configuration
const opts = {
  identity: {
    username: 'BOT NAME HERE',
    password: 'TWITCH BOT PASSWORD'
  },
  channels: [
   'TWITCH CHANNEL'
};

// Contacts the twitch api
const client = new tmi.client(opts);

// Register our event handlers (defined below)
//each event sends to functions below
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on('sub',onTagHandler)
client.on('resub',onTagHandler)
client.on('subgift',onTagHandler)
client.on('cheer',onCheerHandler)


// Connect to Twitch:
client.connect();
//server must be pinged every five minutes
var ping=setInterval(connectionRequirement,300000);
var update=setInterval(updatePoints,60000);

function connectionRequirement(){
	client.ping();
	console.log('* Pinged twitch Servers')
}

const streamlabs = io(`https://sockets.streamlabs.com?token=${socketToken}`, {transports: ['websocket']});
  
  //Perform Action on event
  streamlabs.on('event', (eventData) => {
    if (!eventData.for && eventData.type === 'donation') {
      //code to handle donation events
      const setTarget = '#nebulician';
      var check = searchList(eventData.message[0].from);
      var points;
      
      	if (eventData.message[0].currency === 'USD'){
      		points = parseInt(eventData.message[0].amount);
      		points = Math.round(points) * 10;
      		
      	}
      	 if (check == false){
  		addtoList(eventData.message[0].from, points);
  		client.say(setTarget, '@' + `${eventData.message[0].from} added to the list with ${points}!`);
  	}
  	else{
  	    client.say(setTarget, '@' + `${eventData.message[0].from}, receives ${points} points!` );
  		listObj.list.users[check].points += points;
  	} 
      console.log(eventData.message);
    }
    if (eventData.for === 'twitch_account') {
      switch(eventData.type) {
        case 'follow':
          //code to handle follow events
          console.log(eventData.message);
         console.log(`${eventData.message[0].name} just followed!`);
          break;
         
      }
    }
  });



//handles commands given from twitch chat, hardcodes in a few select users to be able to use
//all commmands


// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
  // Remove whitespace from chat message
  var commandName = msg.split(' ');
  
  // If the command is known, let's execute it
  if (commandName[0] === '!dice') {
    const num = rollDice();
    client.say(target, '@' + context.username + ` rolled a ${num}`);
     console.log(`* Executed ${commandName[0]} command`);
  }
  //temporarily stops 'filter' source control
  else if (commandName[0] === '!stoptemp'){
  var usr = context.username;
  	if	(usr.toLowerCase() == 'USR' || usr.toLowerCase() == 'USR'){
  	doWork = false;
  	client.say(target,`Stopped functionality for 3 minutes.`);
  	 setTimeout(function(){
  	 if (doWork == false){
  		turnOn();
  		client.say(target, 'Resumed Functionality.');
  		 
  		}
  	},180000);
  	 console.log(`* Executed ${commandName[0]} command`);
 	 }
 	  else{
  	  console.log(`* ${context.username} has insuffient priviledges and cannot use ${commandName[0]}`);
  	 }
  }
  //stops 'filter' source control
  else if (commandName[0] === '!stop'){
  	var usr = context.username;
  	if	(usr.toLowerCase() == 'USR' || usr.toLowerCase() == 'USR'){
  	doWork = false;
  	client.say(target,`Stopped functionality.`);
  	 console.log(`* Executed ${commandName[0]} command`);
  	 }
  	 else{
  	  console.log(`* ${context.username} has insuffient priviledges and cannot use ${commandName[0]}`);
  	 }
  	 
  }
  //resumes 'filter' source control
  else if (commandName[0] === '!resume'){
  var usr = context.username;
  	if	(usr.toLowerCase() == 'USR' || usr.toLowerCase() == 'USR'){
  	turnOn(target);
  	client.say(target,`Resumed functionality.`);
  	 console.log(`* Executed ${commandName[0]} command`);
  	}
  	 else{
  	  console.log(`* ${context.username} has insuffient priviledges and cannot use ${commandName[0]}`);
  	 }
  }
  //turns on and off a 'filter' source in OBS
  else if (commandName[0] === '!filter'){
  if (doWork == true){
  		var check = searchList(context.username);
  	
  		if (check == false){
  			console.say(target, '@' + `${context.username}, you are not on the list!`);
  		}
  		else{
  			if (listObj.list.users[check].points > 10){
  				var num= parseInt(commandName[1]);
  				if (isNaN(num) === false){
  					setFilter(true,num);
  					setTimeout(function(){ waitTime(num) }, 30000); 
  					client.say(target, '@' + context.username + `, filter activated`);
  					listObj.list.users[check].points -= 10;
  					}
  				else{
  				client.say(target, '@' + context.username + ` ${commandName[1]} is an invalid parameter.`);
  				}
  			}
  			else{
  				client.say(target, '@' + context.username + `, you do not have enough points!`);
  			}
  		}
  	}
  	else{
  		client.say(target,`Currently unavailable.`);
  	}
  	 console.log(`* Executed ${commandName[0]} command`);
  }
  //shows the user how many points they have
  else if (commandName[0] === '!points'){
  	var check = searchList(context.username);
  	
  	if (check == false){
  		client.say(target, '@'  +  `${context.username}, you are not on the list!`);
  	}
  	
  	else{
  		client.say(target, '@' +  `${context.username}, you have ${listObj.list.users[check].points} points. `);
  	}
  	 console.log(`* Executed ${commandName[0]} command`);

  }
  
  //gives points to users already on the list
  else if (commandName[0] === '!givepoints'){
  	var usr = context.username;
  	if	(usr.toLowerCase() == 'USR' || usr.toLowerCase() == 'USR'){
  		var check = searchList(commandName[1]);
  		
  		if (check == false){
  			client.say(target, '@' + `${commandName[1]}, is not on the list!`);
  		}
  		else{
  		console.log(`* Executed ${commandName[0]} command`);
  			var points=commandName[2];
  	  		if (points === undefined){
  	  			points = 0;
  	  		}
  	   	 points=parseInt(points);
  	   	 client.say(target, '@'  +  `${commandName[1]}, receives ${points} points!` )
  			listObj.list.users[check].points += points;
  		}
  	
  	
  	}
  	  else{
  	  console.log(`* ${context.username} has insuffient priviledges and cannot use ${commandName[0]}`);
  	 }
  	 
  }
  //adds user to a list with or without points, so they can get points
  else if (commandName[0] === '!addtolist'){
  var usr = context.username;
  if (usr.toLowerCase() == 'USR' || usr.toLowerCase() == 'USR'){
    console.log(`* Executed ${commandName[0]} command`);
  	var check = searchList(commandName[1]);
  	if (check == false){
  	  		var points=commandName[2];
  	  		if (points === undefined){
  	  			points = 0;
  	  		}
  	   	 points=parseInt(points);
  			addtoList(commandName[1],points);
  			client.say(target, '@'  + `${commandName[1]}, added to list with ${points} points!` );
  			}
  		else{
  			 client.say(target, '@'  + `${commandName[1]} is already on the list!` );
  		}
	  }
	   else{
  	  console.log(`* ${context.username} has insuffient priviledges and cannot use ${commandName[0]}`);
  	 }
  }
  
  //searches list for a user
  else if (commandName[0] === '!search'){
  var usr = context.username;
  	var check = searchList(commandName[1]);
  	
  	if (check == false){
  		client.say(target, '@' + `${commandName[1]}, is not on the list!`);
  	}
  	
  	else{
  		client.say(target, '@'  +  `${commandName[1]} currently has ${listObj.list.users[check].points} points. `);
  		}
  
		 console.log(`* Executed ${commandName[0]} command`);
	}
  
  else if (commandName[0][0] == '!'){
    console.log(`*${commandName[0]} is an invalid command!`);
  }
  
  //wait to set the filter off
  function waitTime(num){
  setFilter(false,num);
  }
  
  
  
  //turns filters on/off
  function setFilter(onOff,num){
  	obs.connect({
        address: 'localhost:4444',
        password: 'test'
    })
    .then(() => {
        console.log(`*Success! We're connected & authenticated.`);

        return obs.send('GetCurrentScene');
    })
    .then(data => {
    	var gSource=findSource(data);
    	 console.log(gSource)
    	 if (num > data.sources[gSource].groupChildren.length || num < 0){
    	 	num=0;
    	 }
//    	 console.log(data.sources[gSource].groupChildren[num].name);
    	return obs.send('SetSceneItemProperties',{
    	'scene-name': data.name,'item': data.sources[gSource].groupChildren[num].name, 'visible': onOff
    });

	})
	.then(settings => {
	obs.disconnect();
	})
	  
    .catch(err => { // Promise convention dicates you have a catch on every chain.
        console.log(err);
    });
    

	obs.on('SwitchScenes', data => {
   	 console.log(`New Active Scene: ${data.sceneName}`);
	});

// You must add this handler to avoid uncaught exceptions.
	obs.on('error', err => {
   	 console.error('socket error:', err);
		});
  	}
}

//set filter on
function turnOn(target){
	doWork=true;
}

//finds the 'filter' source used to dynamically find the source if it is moved in obs
function findSource(data){
	var name= 'testgroup'
	var num = 0;
	
	while(data.sources[num].name != name){
	num +=1;
	}
	return num;
}

// Function called when the "dice" command is issued
function rollDice () {
  const sides = 10;
  return Math.floor(Math.random() * sides) + 1;
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
  
  
}
//called every time someone gifts, resubs, subs
function onGiftHandler(channel,username,streakmonths,recipient, methods,userstate){
	console.log(channel,username,streakmonths,recipient, methods,userstate)
}
//called every time someone cheers
function onCheerHandler(channel,userstate,message){
	var points;

	var check=searchList(userstate.username);
	if (userstate.bits % 100 == 0){
  	 points=userstate.bits/10;
  	 }
  	 else{
  	 points=1;
  	 }
	
	if (check == false){
		// console.log(`${userstate.username} added to list with ${points}!`);
		client.say(channel, '@'  + `${userstate.username} added to list with ${points}`);
  		 addtoList(userstate.username,points);
	}
	else{
		listObj.list.users[check].points += points;
		 // console.log(`${userstate.username} cheered ${userstate.bits} and gets ${points}!`);
		 client.say(channel, '@' + ` ${userstate.username} cheered ${userstate.bits} and gets ${points}!`);
	}
}
//checks a subscribers tier, gives points based on tier
function tierCheck(userstate){
	if (userstate['msg-param-sub-plan'] == 2000){
		return 20;
	}
	else if (userstate['msg-param-sub-plan'] == 3000){
		return 30;
	}
	else{
	return 10;
	}
}


//handles usernames/ calls to search the list/ adds points/ adds to list
function onTagHandler(channel, username, methods, message, userstate){
	var points=tierCheck(userstate);
	var check=searchList(username);
	if (check == false){
		 //console.log(`Added ${username} to list with ${points} points!`);
		 client.say(channel, '@'  + `@${userstate.username} added to list with ${points}`);
  		 addtoList(username,points);
	}
	else{
		listObj.list.users[check].points += points;
		//console.log(`${username} receives ${points} points!`);
		client.say(channel, '@'  + `${username} receives ${points} points!`);
	}
}
//searches the list to see if user is already on it or not
function searchList(username){
	username=username.toLowerCase();
	 for (var i=0; i<listObj.list.users.length; i++){
		if (listObj.list.users[i].name == username ){
		//console.log(listObj.list.users[i]);
		return i;
  	}
  }
  return false;
}

//

//called every minute above to save the list
function updatePoints(){	
	var json = JSON.stringify(listObj.list);
	json = "module.exports.list = " + json;
	let callback = function(err) {
 	if (err) throw err;
 	//console.log('The file has been saved!');
};
	fs.writeFile('dir/eligible.js', json,callback);
}
//adds user to list, called from above code
function addtoList(username,points) {
	username=username.toLowerCase();
	listObj.list.users.push({"name":`${username}`,"points":points})
	var json = JSON.stringify(listObj.list);
	json = "module.exports.list = " + json;
	let callback = function(err) {
 	if (err) throw err;
 	console.log('The file has been saved!');
};
	fs.writeFile('dir/eligible.js', json, callback);
	
}