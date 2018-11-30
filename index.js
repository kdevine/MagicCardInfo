// Alexa SDK for JavaScript v1.0.00
// Copyright (c) 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved. Use is subject to license terms.
// Magic Card Info skill

//var APP_ID = "amzn1.echo-sdk-ams.app.4b66dfa8-7c58-41e8-8957-f12f419bc0d0";
var APP_ID = undefined;
var AlexaDate = require('./alexaDateUtil');
var AlexaSkill = require('./AlexaSkill');
var http = require('http');
var https = require('https');
var MCI = function () {
    MCI.call(this, APP_ID);
};

// Extend AlexaSkill
MCI.prototype = Object.create(AlexaSkill.prototype);
MCI.prototype.constructor = MCI;

// ----------------------- Override AlexaSkill request and intent handlers -----------------------

MCI.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

MCI.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    handleWelcomeRequest(response);
};

MCI.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

/**
 * override intentHandlers to map intent handling functions.
 */
MCI.prototype.intentHandlers = {
    "AMAZON.HelpIntent": function (intent, session, response) {
        handleHelpRequest(response);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },
	"CardNameIntent": function(intent, session, response) {
		handleCardnameRequest(response);
	},
	"CardTypeIntent": function(intent, session, response) {
		handleCardTypeIntent(response);
	},
	"FuzzySearchIntent": function(intent, session, response) {
		handleFuzzySearchIntent(response);
	}
};

function handleWelcomeRequest(response) {
    
    var speechOutput = "Welcome to Magic Card Info.  If you give me a card name, I will read you the casting cost and rules text.";
	var repromptText = "Please tell me a card name.";
	response.ask(speechOutput, repromptText);
}

function handleHelpRequest(response) {
    var repromptText = "Please tell me a card name.";
    var speechOutput = "I can look up cards by name if you say Ask Magic Card Info for Fireball. "
        + "or, you can ask for a type of spell and get a list like Ask Magic Card Info for Red Soceries in Tempest. "
        + "or, you can ask for a fuzzy search like Ask Magic Card Info for cards that say X damage."
        + "For a list of supported commands, check the card in the Alexa App."
        + repromptText;

    response.ask(speechOutput, repromptText);
}

function handleCardnameRequest(intent, session, response) {
	var cardObject = getCardObjectFromIntent(intent, true);
	var speechOutput;
	if (cardObject.error) {
		var repromptText = "Which card name would you like the rules text for?";
        speechOutput = cardObject.name ? "I'm sorry, I don't have any data for " + cardObject.name + ". " + repromptText : repromptText;
        response.ask(speechOutput, repromptText);
        return;
	}
	getCardInfo(cardObject, function dbResponseCallback(err, dbResponse) {
		var speechOutput;
		if (err) {
			speechOutput = "Sorry, the deckbrew service is experiencing a problem. Please try again later";
		} else {
			speechOutput = "The card " + dbResponse.name + " is " + convertCardTypeToSpeech(dbResponse.types) + " and costs " + convertManaCostToSpeech(dbResponse.cost) + ". " + convertRulesTextToSpeech(dbResponse.text);
			var cardOutput = speechOutput
			response.tellWithCard(speechOutput, "Magic Card Info", cardOutput);
		}
	});
}

function getCardInfo(cardObject, dbResponseCallback) {
	var options = {
		hostname: 'api.deckbrew.com',
		path: '/mtg/cards/' + cardObject.name,
		method: 'GET',
		headers: {
			'Accept': 'Application/json'
		}
	};
    callback = function(response) {
		var str = '';
		response.on('data', function (chunk) {
			str += chunk;
		});
		response.on('end', function () {
			var dbResponseObject = JSON.parse(str);
			if (dbResponseObject.error) {
                console.log("DeckBrew error: " + dbResponseObject.error.message);
                dbResponseCallback(new Error(dbResponseObject.error.message));
            } else {
				console.log(dbResponseObject);
                dbResponseCallback(null, dbResponseObject.value);
            }
		});
		response.on('error',function(e) {
			console.error(e);
		});
	};
	var req = https.request(options, callback);
	req.end();
	req.on('error', function(e) {
		console.error(e);
		dbResponseCallback(new Error(e.message));
	});
}

function getCardObjectFromIntent(intent, assignDefault) {

    var cardNameSlot = intent.slots.CardName;
	console.log("CardName Slot: " + cardNameSlot);
    // slots can be missing, or slots can be provided but with empty value.
    // must test for both.
    if (!cardNameSlot || !cardNameSlot.value) {
        if (!assignDefault) {
            return {
                error: true
            };
        } else {
            return {
				 name: 'Fireball',
				 id: 'fireball'
			};
		}
    } else {
        var cardName = cardNameSlot.value;
		console.log("cardName for cardNameSlot: " + cardName);
        return {
				name: cardName,
				id: cardName
		};
    }
}

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    var mci = new MCI();
    MCI.execute(event, context);
};
