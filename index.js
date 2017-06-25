//
// Main handler for Alexa slot machine skill
//

'use strict';

const AWS = require('aws-sdk');
const Alexa = require('alexa-sdk');
const Bet = require('./intents/Bet');
const Spin = require('./intents/Spin');
const Rules = require('./intents/Rules');
const Help = require('./intents/Help');
const Exit = require('./intents/Exit');
const Launch = require('./intents/Launch');
const Select = require('./intents/Select');

const APP_ID = 'amzn1.ask.skill.dcc3c959-8c93-4e9a-9cdf-ccdccd5733fd';

// Handlers for our skill
const selectGameHandlers = Alexa.CreateStateHandler('SELECTGAME', {
  'NewSession': function() {
    this.handler.state = '';
    this.emitWithState('NewSession');
  },
  'AMAZON.YesIntent': Select.handleYesIntent,
  'AMAZON.NoIntent': Select.handleNoIntent,
  'AMAZON.StopIntent': Exit.handleIntent,
  'AMAZON.CancelIntent': Exit.handleIntent,
  'SessionEndedRequest': function() {
    this.emit(':saveState', true);
  },
  'Unhandled': function() {
    const res = require('./' + this.event.request.locale + '/resources');
    this.emit(':ask', res.strings.UNKNOWN_SELECT_INTENT, res.strings.UNKNOWN_SELECT_INTENT_REPROMPT);
  },
});

const inGameHandlers = Alexa.CreateStateHandler('INGAME', {
  'NewSession': function() {
    this.handler.state = '';
    this.emitWithState('NewSession');
  },
  'BetIntent': Bet.handleIntent,
  'SpinIntent': Spin.handleIntent,
  'RulesIntent': Rules.handleIntent,
  'SelectIntent': Select.handleIntent,
  'AMAZON.YesIntent': Spin.handleIntent,
  'AMAZON.NoIntent': Exit.handleIntent,
  'AMAZON.HelpIntent': Help.handleIntent,
  'AMAZON.StopIntent': Exit.handleIntent,
  'AMAZON.CancelIntent': Exit.handleIntent,
  'SessionEndedRequest': function() {
    this.emit(':saveState', true);
  },
  'Unhandled': function() {
    const res = require('./' + this.event.request.locale + '/resources');
    this.emit(':ask', res.strings.UNKNOWN_INTENT, res.strings.UNKNOWN_INTENT_REPROMPT);
  },
});

const handlers = {
  'NewSession': function() {
    // Initialize attributes and route the request
    if (!this.attributes.currentGame) {
      this.attributes.currentGame = 'basic';
    }

    if (!this.attributes[this.attributes.currentGame]) {
      this.attributes[this.attributes.currentGame] = {
        bankroll: 1000,
        high: 1000,
      };
    }

    this.emit('LaunchRequest');
  },
  'LaunchRequest': Launch.handleIntent,
  'Unhandled': function() {
    const res = require('./' + this.event.request.locale + '/resources');
    this.emit(':ask', res.strings.UNKNOWN_INTENT, res.strings.UNKNOWN_INTENT_REPROMPT);
  },
};

exports.handler = function(event, context, callback) {
  // Small enough volume for me to just write the incoming request
  if (event) {
    console.log(JSON.stringify(event));
  }

  AWS.config.update({region: 'us-east-1'});

  const alexa = Alexa.handler(event, context);

  alexa.appId = APP_ID;
  alexa.dynamoDBTableName = 'Slots';
  alexa.registerHandlers(handlers, inGameHandlers, selectGameHandlers);
  alexa.execute();
};
