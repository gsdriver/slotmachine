//
// Main handler for Alexa slot machine skill
//

'use strict';

const Alexa = require('ask-sdk');
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
const SelectYes = require('./intents/SelectYes');
const SelectNo = require('./intents/SelectNo');
const Unhandled = require('./intents/Unhandled');
const SessionEnd = require('./intents/SessionEnd');
const utils = require('./utils');
const request = require('request');

let responseBuilder;

const requestInterceptor = {
  process(handlerInput) {
    return new Promise((resolve, reject) => {
      const attributesManager = handlerInput.attributesManager;
      const sessionAttributes = attributesManager.getSessionAttributes();
      const event = handlerInput.requestEnvelope;

      if ((Object.keys(sessionAttributes).length === 0) ||
        ((Object.keys(sessionAttributes).length === 1)
          && sessionAttributes.bot)) {
        // No session attributes - so get the persistent ones
        attributesManager.getPersistentAttributes()
          .then((attributes) => {
            utils.getTournamentComplete(event, attributes, (result) => {
              if (!attributes.currentGame) {
                attributes.currentGame = 'basic';
                attributes.newUser = true;
                request.post({url: process.env.SERVICEURL + 'slots/newUser'}, (err, res, body) => {
                });
              }

              attributes.playerLocale = event.request.locale;
              if (!attributes[attributes.currentGame]) {
                attributes[attributes.currentGame] = {
                  bankroll: 1000,
                  high: 1000,
                };
              }

              if (result && (result.length > 0)) {
                attributes.tournamentResult = result;
              }

              // Since there were no session attributes, this is the first
              // round of the session - set the temp attributes
              attributes.temp = {};
              attributes.sessions = (attributes.sessions + 1) || 1;
              attributes.bot = sessionAttributes.bot;
              attributesManager.setSessionAttributes(attributes);
              responseBuilder = handlerInput.responseBuilder;
              resolve();
            });
          })
          .catch((error) => {
            reject(error);
          });
      } else {
        responseBuilder = handlerInput.responseBuilder;
        resolve();
      }
    });
  },
};

const saveResponseInterceptor = {
  process(handlerInput) {
    return new Promise((resolve, reject) => {
      const response = handlerInput.responseBuilder.getResponse();

      if (response) {
        utils.drawTable(handlerInput);
        if (response.shouldEndSession) {
          // We are meant to end the session
          SessionEnd.handle(handlerInput);
        }
      }
      resolve();
    });
  },
};

const ErrorHandler = {
  canHandle(handlerInput, error) {
    console.log(error);
    return error.name.startsWith('AskSdk');
  },
  handle(handlerInput, error) {
    return handlerInput.responseBuilder
      .speak('An error was encountered while handling your request. Try again later')
      .getResponse();
  },
};

if (process.env.DASHBOTKEY) {
  const dashbot = require('dashbot')(process.env.DASHBOTKEY).alexa;
  exports.handler = dashbot.handler(runGame);
} else {
  exports.handler = runGame;
}

function runGame(event, context, callback) {
  const skillBuilder = Alexa.SkillBuilders.standard();

  if (!process.env.NOLOG) {
    console.log(JSON.stringify(event));
  }

  // If this is a CanFulfill, handle this separately
  if (event.request && (event.request.type == 'CanFulfillIntentRequest')) {
    callback(null, CanFulfill.check(event));
    return;
  }

  utils.checkForTournament(event);
  const skillFunction = skillBuilder.addRequestHandlers(
      Launch,
      HighScore,
      Rules,
      Select,
      SelectYes,
      SelectNo,
      Button,
      Spin,
      Help,
      Stop,
      Exit,
      SessionEnd,
      Unhandled
    )
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(requestInterceptor)
    .addResponseInterceptors(saveResponseInterceptor)
    .withTableName('Slots')
    .withAutoCreateTable(true)
    .withSkillId('amzn1.ask.skill.dcc3c959-8c93-4e9a-9cdf-ccdccd5733fd')
    .lambda();
  skillFunction(event, context, (err, response) => {
    if (response) {
      response.response = responseBuilder.getResponse();
    }
    callback(err, response);
  });
}