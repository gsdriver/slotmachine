//
// Main handler for Alexa slot machine skill
//

'use strict';

const Alexa = require('ask-sdk');
const CanFulfill = require('./intents/CanFulfill');
const OldTimeOut = require('./intents/OldTimeOut');
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
const Purchase = require('./intents/Purchase');
const ListPurchases = require('./intents/ListPurchases');
const Refund = require('./intents/Refund');
const Reminder = require('./intents/Reminder');
const ProductResponse = require('./intents/ProductResponse');
const Reprompt = require('./intents/Reprompt');
const Unhandled = require('./intents/Unhandled');
const SessionEnd = require('./intents/SessionEnd');
const utils = require('./utils');
const request = require('request');
const {ri, JargonSkillBuilder} = require('@jargon/alexa-skill-sdk');

const requestInterceptor = {
  process(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const event = handlerInput.requestEnvelope;
    let attributes;

    if ((Object.keys(sessionAttributes).length === 0) ||
      ((Object.keys(sessionAttributes).length === 1)
        && sessionAttributes.platform)) {
      // No session attributes - so get the persistent ones
      return attributesManager.getPersistentAttributes()
        .then((attr) => {
          // If they were playing loose, then please nuke it
          attributes = attr;
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
          attributes.temp.sessionStart = Date.now();
          utils.checkForTournament(attributes);
          return utils.getTournamentComplete(handlerInput, attributes);
        })
        .then((result) => {
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

          // Since there were no session attributes, this is the first
          // round of the session - set the temp attributes
          attributes.tournamentResult = result;
          attributes.sessions = (attributes.sessions + 1) || 1;
          attributes.platform = sessionAttributes.platform;
          attributesManager.setSessionAttributes(attributes);
          return;
        }).then(() => {
          return handlerInput.jrm.renderObject(ri('SYMBOL_LIST'));
        }).then((symbolList) => {
          attributes.temp.symbolList = symbolList;
          return Promise.resolve();
        });
    } else {
      attributes = handlerInput.attributesManager.getSessionAttributes();
      attributes.temp.speechParams = {};
      attributes.temp.repromptParams = {};
      utils.checkForTournament(attributes);
      return Promise.resolve();
    }
  },
};

const saveResponseInterceptor = {
  process(handlerInput) {
    const response = handlerInput.responseBuilder.getResponse();
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    if (response) {
      return utils.drawTable(handlerInput).then(() => {
        if (response.shouldEndSession) {
          // We are meant to end the session
          // We're ending the session so ignore timeouts
          attributes.temp.ignoreTimeouts = true;
          SessionEnd.handle(handlerInput);
        } else {
          // Save the response and reprompt for repeat
          if (response.outputSpeech && response.outputSpeech.ssml) {
            // First off - count the audio tags.  If more than 5, remove the last one
            let audioTags = (response.outputSpeech.ssml.match(/<audio/g) || []).length;
            let index;
            let end;

            while (audioTags > 5) {
              audioTags--;
              index = response.outputSpeech.ssml.lastIndexOf('<audio');
              end = response.outputSpeech.ssml.indexOf('>', index);
              response.outputSpeech.ssml =
                response.outputSpeech.ssml.substring(0, index)
                + response.outputSpeech.ssml.substring(end + 1);
            }

            // Strip <speak> tags
            let lastResponse = response.outputSpeech.ssml;
            lastResponse = lastResponse.replace('<speak>', '');
            lastResponse = lastResponse.replace('</speak>', '');
            attributes.temp.lastResponse = lastResponse;
          }
          if (response.reprompt && response.reprompt.outputSpeech
            && response.reprompt.outputSpeech.ssml) {
            let lastReprompt = response.reprompt.outputSpeech.ssml;
            lastReprompt = lastReprompt.replace('<speak>', '');
            lastReprompt = lastReprompt.replace('</speak>', '');
            attributes.temp.lastReprompt = lastReprompt;
          }

          if (attributes.temp) {
            if (attributes.temp.deferReprompt) {
              // Oh, actually we don't want to reprompt but will
              // rely on the button timeout to handle a reprompt
              response.reprompt = undefined;
              attributes.temp.deferReprompt = undefined;

              // If should end session is true, set it to false
              if (response.shouldEndSession) {
                handlerInput.responseBuilder.withShouldEndSession(false);
              }
            }
            // If there is a reprompt - set a flag so any errant
            // input handler reprompt timeout events are ignored
            attributes.temp.ignoreTimeouts = (response.reprompt) ? true : false;
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
        if (!process.env.NOLOG) {
          console.log(JSON.stringify(response));
        }
      });
    } else {
      return Promise.resolve();
    }
  },
};

const ErrorHandler = {
  canHandle(handlerInput, error) {
    console.log(error);
    return error.name.startsWith('AskSdk');
  },
  handle(handlerInput, error) {
    return handlerInput.jrb
      .speak(ri('SKILL_ERROR'))
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
  const skillBuilder = new JargonSkillBuilder().wrap(Alexa.SkillBuilders.custom());

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
      OldTimeOut,
      ProductResponse,
      Launch,
      Reprompt,
      Reminder,
      Purchase,
      ListPurchases,
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
    .withApiClient(new Alexa.DefaultApiClient())
    .withSkillId('amzn1.ask.skill.dcc3c959-8c93-4e9a-9cdf-ccdccd5733fd')
    .lambda();
  skillFunction(event, context, (err, response) => {
    callback(err, response);
  });
}
