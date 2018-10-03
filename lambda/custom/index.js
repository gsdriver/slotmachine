//
// Main handler for Alexa slot machine skill
//

'use strict';

const Alexa = require('ask-sdk');
const CanFulfill = require('./intents/CanFulfill');
const Spin = require('./intents/Spin');
const Rules = require('./intents/Rules');
const HighScore = require('./intents/HighScore');
const Help = require('./intents/Help');
const Exit = require('./intents/Exit');
const Stop = require('./intents/Stop');
const Launch = require('./intents/Launch');
const Select = require('./intents/Select');
const SelectYes = require('./intents/SelectYes');
const SelectNo = require('./intents/SelectNo');
const Testing = require('./intents/Testing');
const Purchase = require('./intents/Purchase');
const Refund = require('./intents/Refund');
const ProductResponse = require('./intents/ProductResponse');
const Unhandled = require('./intents/Unhandled');
const SessionEnd = require('./intents/SessionEnd');
const utils = require('./utils');
const request = require('request');
const Jargon = require('@jargon/alexa-skill-sdk');

const requestInterceptor = {
  process(handlerInput) {
    return new Promise((resolve, reject) => {
      const attributesManager = handlerInput.attributesManager;
      const sessionAttributes = attributesManager.getSessionAttributes();
      const event = handlerInput.requestEnvelope;

      if ((Object.keys(sessionAttributes).length === 0) ||
        ((Object.keys(sessionAttributes).length === 1)
          && sessionAttributes.platform)) {
        // No session attributes - so get the persistent ones
        attributesManager.getPersistentAttributes()
          .then((attributes) => {
            // If they were playing loose, then please nuke it
            if (attributes.loose) {
              attributes.loose = undefined;
            }
            if (attributes.currentGame === 'loose') {
              attributes.currentGame = 'standard';
            }
            if (!attributes.prompts) {
              attributes.prompts = {};
            }
            attributes.temp = {};
            attributes.temp.speechParams = {};
            attributes.temp.repromptParams = {};
            utils.checkForTournament(attributes);
            utils.getTournamentComplete(handlerInput, attributes, (result) => {
              if (!attributes.currentGame) {
                attributes.currentGame = 'basic';
                attributes.newUser = true;
                request.post({url: process.env.SERVICEURL + 'slots/newUser'}, (err, res, body) => {
                });
              }

              attributes.playerLocale = event.request.locale;
              if (!attributes[attributes.currentGame]) {
                attributes[attributes.currentGame] = {};
                attributes.bankroll = utils.STARTING_BANKROLL;
                attributes.high = utils.STARTING_BANKROLL;
              }

              // Migrate to a common bankroll - if a legacy player,
              // we will set the bankroll to the highest (non-tournament)
              // game bankroll
              if (attributes.bankroll === undefined) {
                let maxGameBankroll;
                let maxHigh;
                let game;
                let totalSpins = 0;
                let lastPlay;
                for (game in attributes) {
                  if (attributes[game] && attributes[game].bankroll &&
                    (game !== 'tournament')) {
                    totalSpins += attributes[game].spins;
                    if ((maxGameBankroll === undefined) ||
                      (attributes[game].bankroll > maxGameBankroll)) {
                      maxGameBankroll = attributes[game].bankroll;
                    }
                    if ((maxHigh === undefined) ||
                      (attributes[game].high > maxHigh)) {
                      maxHigh = attributes[game].high;
                    }
                    if ((lastPlay == undefined) ||
                      (attributes[game].timestamp > lastPlay)) {
                      lastPlay = attributes[game].timestamp;
                    }

                    attributes[game].bankroll = undefined;
                    attributes[game].high = undefined;
                  }
                }

                // OK, if they haven't done more than 10 total spins, or
                // they haven't played for more than 30 days and have less than 100 spins
                // we will reset them to the starting bankroll
                if ((totalSpins < 10) ||
                  ((totalSpins < 100) && (Date.now() - lastPlay > 30*24*60*60*1000))) {
                  maxGameBankroll = utils.STARTING_BANKROLL;
                  maxHigh = utils.STARTING_BANKROLL;
                }

                attributes.bankroll = maxGameBankroll;
                attributes.high = maxHigh;
              }

              if (result && (result.length > 0)) {
                attributes.tournamentResult = result;
              }

              // Since there were no session attributes, this is the first
              // round of the session - set the temp attributes
              attributes.sessions = (attributes.sessions + 1) || 1;
              attributes.platform = sessionAttributes.platform;
              attributesManager.setSessionAttributes(attributes);
              resolve();
            });
          })
          .catch((error) => {
            reject(error);
          });
      } else {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes.temp.speechParams = {};
        attributes.temp.repromptParams = {};
        utils.checkForTournament(attributes);
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
        utils.drawTable(handlerInput, () => {
          if (response.shouldEndSession) {
            // We are meant to end the session
            SessionEnd.handle(handlerInput);
          } else {
            // Save the response and reprompt for repeat
            const attributes = handlerInput.attributesManager.getSessionAttributes();
            if (response.outputSpeech && response.outputSpeech.ssml) {
              attributes.temp.lastResponse = response.outputSpeech.ssml;
            }
            if (response.reprompt && response.reprompt.outputSpeech
              && response.reprompt.outputSpeech.ssml) {
              attributes.temp.lastReprompt = response.reprompt.outputSpeech.ssml;
            }

            // Save state if we need to (but just for certain platforms)
            if (attributes.temp && attributes.temp.forceSave) {
              attributes.temp.forceSave = undefined;
              if (attributes.platform === 'google') {
                // Save state each round in case the user unexpectedly exits
                const temp = attributes.temp;
                attributes.temp = undefined;
                handlerInput.attributesManager.setPersistentAttributes(attributes);
                handlerInput.attributesManager.savePersistentAttributes();
                attributes.temp = temp;
              }
            }
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  },
};

const ErrorHandler = {
  canHandle(handlerInput, error) {
    console.log(error);
    return error.name.startsWith('AskSdk');
  },
  handle(handlerInput, error) {
    return handlerInput.jrb
      .speak(Jargon.ri('SKILL_ERROR'))
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
  const skillBuilder = new Jargon.JargonSkillBuilder().wrap(Alexa.SkillBuilders.custom());

  if (!process.env.NOLOG) {
    console.log(JSON.stringify(event));
  }

  // If this is a CanFulfill, handle this separately
  if (event.request && (event.request.type == 'CanFulfillIntentRequest')) {
    callback(null, CanFulfill.check(event));
    return;
  }

  const {DynamoDbPersistenceAdapter} = require('ask-sdk-dynamodb-persistence-adapter');
  const dbAdapter = new DynamoDbPersistenceAdapter({
    tableName: 'Slots',
    partitionKeyName: 'userId',
    attributesName: 'mapAttr',
  });
  const skillFunction = skillBuilder.addRequestHandlers(
      ProductResponse,
      Launch,
      Testing,
      Purchase,
      Refund,
      HighScore,
      Rules,
      Select,
      SelectYes,
      SelectNo,
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
    .withPersistenceAdapter(dbAdapter)
    .withSkillId('amzn1.ask.skill.dcc3c959-8c93-4e9a-9cdf-ccdccd5733fd')
    .lambda();
  skillFunction(event, context, (err, response) => {
    callback(err, response);
  });
}
