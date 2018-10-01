//
// Handles selecting a game
//

'use strict';

const utils = require('../utils');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return ((attributes.choices && (attributes.choices.length > 0))
      && (((request.type === 'IntentRequest') &&
        ((request.intent.name === 'GameIntent')
        || (request.intent.name === 'AMAZON.YesIntent')))
      || (request.type === 'Display.ElementSelected')));
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);
    let speech;

    // Just in case they were trying to play at the last minute...
    if (!attributes.temp.tournamentAvailable && (attributes.currentGame == 'tournament')) {
      attributes.currentGame = 'basic';
      speech = res.strings.TOURNAMENT_ENDED;
      return handlerInput.responseBuilder
        .speak(utils.ri(speech, attributes.temp.speechParams))
        .withShouldEndSession(true)
        .getResponse();
    }

    return new Promise((resolve, reject) => {
      // First let's see if they selected an element via touch
      utils.selectGame(handlerInput, getSelectedIndex(event, attributes)).then(() => {
        speech = res.pickRandomOption(event, attributes, 'SELECT_WELCOME');
        attributes.temp.speechParams.Game = utils.sayGame(event, attributes.currentGame);

        const game = attributes[attributes.currentGame];
        const rules = utils.getGame(attributes.currentGame);
        const reprompt = res.strings.SELECT_REPROMPT;
        attributes.temp.repromptParams.Coins = rules.maxCoins;
        if (rules.welcome) {
          speech += res.strings[rules.welcome];
        }

        speech += res.strings.READ_BANKROLL;
        attributes.temp.speechParams.Amount = utils.readCoins(event, utils.getBankroll(attributes));
        if (game.progressiveJackpot) {
          // For progressive, just tell them the jackpot and to bet max coins
          speech += res.strings.PROGRESSIVE_JACKPOT;
          attributes.temp.speechParams.Jackpot = game.progressiveJackpot;
          attributes.temp.speechParams.Coins = rules.maxCoins;
        } else {
          speech += reprompt;
          Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);
        }
        const response = handlerInput.responseBuilder
          .speak(utils.ri(speech, attributes.temp.speechParams))
          .reprompt(utils.ri(reprompt, attributes.temp.repromptParams))
          .getResponse();
        resolve(response);
      });
    });
  },
};

function getSelectedIndex(event, attributes) {
  let index;

  if (event.request.token) {
    const games = event.request.token.split('.');
    if (games.length === 2) {
      index = games[1];
    }
  } else {
    // Look for an intent slot
    if (event.request.intent && event.request.intent.slots
      && event.request.intent.slots.Number
      && event.request.intent.slots.Number.value) {
      index = parseInt(event.request.intent.slots.Number.value);

      if (isNaN(index)) {
        index = undefined;
      } else {
        // Turn into zero-based index
        index--;
      }
    }
  }

  if ((index === undefined) || (index < 0) || (index >= attributes.originalChoices.length)) {
    index = 0;
  }

  return index;
}
