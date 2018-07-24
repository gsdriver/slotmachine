//
// Main handler for Alexa slot machine skill
//

'use strict';

const AWS = require('aws-sdk');
const Alexa = require('alexa-sdk');
const Bet = require('./intents/Bet');
const CanFulfill = require('./intents/CanFulfill');
const Spin = require('./intents/Spin');
const Button = require('./intents/Button');
const Rules = require('./intents/Rules');
const HighScore = require('./intents/HighScore');
const Help = require('./intents/Help');
const Exit = require('./intents/Exit');
const Stop = require('./intents/Stop');
const Launch = require('./intents/Launch');
const Select = require('./intents/Select');
const utils = require('./utils');
const request = require('request');
const resources = require('./resources');

const APP_ID = 'amzn1.ask.skill.dcc3c959-8c93-4e9a-9cdf-ccdccd5733fd';

// Handlers for our skill
const selectGameHandlers = Alexa.CreateStateHandler('SELECTGAME', {
  'NewSession': function() {
    this.handler.state = '';
    this.emitWithState('NewSession');
  },
  'BetIntent': Select.handleBetIntent,
  'ElementSelected': Select.handleYesIntent,
  'GameIntent': Select.handleYesIntent,
  'SpinIntent': Select.handleBetIntent,
  'GameEngine.InputHandlerEvent': Button.handleIntent,
  'RulesIntent': Rules.handleIntent,
  'SelectIntent': Select.handleNoIntent,
  'HighScoreIntent': HighScore.handleIntent,
  'AMAZON.HelpIntent': Help.handleIntent,
  'AMAZON.YesIntent': Select.handleYesIntent,
  'AMAZON.FallbackIntent': Help.handleIntent,
  'AMAZON.NextIntent': Select.handleNoIntent,
  'AMAZON.NoIntent': Select.handleNoIntent,
  'AMAZON.StopIntent': Stop.handleIntent,
  'AMAZON.CancelIntent': Exit.handleIntent,
  'SessionEndedRequest': function() {
    saveState(this.event.session.user.userId, this.attributes);
  },
  'Unhandled': function() {
    utils.emitResponse(this, null, null,
          this.t('UNKNOWN_SELECT_INTENT'), this.t('UNKNOWN_SELECT_INTENT_REPROMPT'));
  },
});

const inGameHandlers = Alexa.CreateStateHandler('INGAME', {
  'NewSession': function() {
    this.handler.state = '';
    this.emitWithState('NewSession');
  },
  'BetIntent': Bet.handleIntent,
  'ElementSelected': Spin.handleIntent,
  'GameIntent': Spin.handleIntent,
  'SpinIntent': Spin.handleIntent,
  'GameEngine.InputHandlerEvent': Button.handleIntent,
  'RulesIntent': Rules.handleIntent,
  'SelectIntent': Select.handleIntent,
  'HighScoreIntent': HighScore.handleIntent,
  'AMAZON.FallbackIntent': Help.handleIntent,
  'AMAZON.YesIntent': Spin.handleIntent,
  'AMAZON.NextIntent': Spin.handleIntent,
  'AMAZON.NoIntent': Exit.handleIntent,
  'AMAZON.HelpIntent': Help.handleIntent,
  'AMAZON.StopIntent': Stop.handleIntent,
  'AMAZON.CancelIntent': Exit.handleIntent,
  'SessionEndedRequest': function() {
    saveState(this.event.session.user.userId, this.attributes);
  },
  'Unhandled': function() {
    utils.emitResponse(this, null, null,
          this.t('UNKNOWN_INTENT'), this.t('UNKNOWN_INTENT_REPROMPT'));
  },
});

const handlers = {
  'NewSession': function() {
    utils.getTournamentComplete(this, (result) => {
      // Initialize attributes and route the request
      if (!this.attributes.currentGame) {
        // This is a new user
        this.attributes.newUser = true;
        this.attributes.currentGame = 'basic';
      }

      this.attributes.playerLocale = this.event.request.locale;
      if (!this.attributes[this.attributes.currentGame]) {
        this.attributes[this.attributes.currentGame] = {
          bankroll: 1000,
          high: 1000,
        };
      }

      if (result && (result.length > 0)) {
        this.attributes.tournamentResult = result;
      }
      this.emit('LaunchRequest');
    });
  },
  'LaunchRequest': Launch.handleIntent,
  'Unhandled': function() {
    utils.emitResponse(this, null, null,
          this.t('UNKNOWN_INTENT'), this.t('UNKNOWN_INTENT_REPROMPT'));
  },
};

if (process.env.DASHBOTKEY) {
  const dashbot = require('dashbot')(process.env.DASHBOTKEY).alexa;
  exports.handler = dashbot.handler(runSkill);
} else {
  exports.handler = runSkill;
}

function runSkill(event, context, callback) {
  AWS.config.update({region: 'us-east-1'});
  if (!process.env.NOLOG) {
    console.log(JSON.stringify(event));
  }

  // If this is a CanFulfill, handle this separately
  if (event.request && (event.request.type == 'CanFulfillIntentRequest')) {
    context.succeed(CanFulfill.check(event));
    return;
  }

  const alexa = Alexa.handler(event, context);
  alexa.resources = resources.languageStrings;

  // The first thing we need to check is whether to offer a tournament machine
  utils.checkForTournament(event);
  alexa.appId = APP_ID;

  if (!event.session.sessionId || event.session['new']) {
    const doc = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
    doc.get({TableName: 'Slots',
            ConsistentRead: true,
            Key: {userId: event.session.user.userId}},
            (err, data) => {
      if (err || (data.Item === undefined)) {
        if (err) {
          console.log('Error reading attributes ' + err);
        } else {
          request.post({url: process.env.SERVICEURL + 'slots/newUser'}, (err, res, body) => {
          });
        }
      } else {
        Object.assign(event.session.attributes, data.Item.mapAttr);
      }

      execute();
    });
  } else {
    execute();
  }

  function execute() {
    alexa.registerHandlers(handlers, inGameHandlers, selectGameHandlers);
    alexa.execute();
  }
}

function saveState(userId, attributes) {
  const formData = {};

  formData.savedb = JSON.stringify({
    userId: userId,
    attributes: attributes,
  });

  const params = {
    url: process.env.SERVICEURL + 'slots/saveState',
    formData: formData,
  };

  request.post(params, (err, res, body) => {
    if (err) {
      console.log(err);
    }
  });
}
