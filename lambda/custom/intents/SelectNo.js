//
// Handles selecting a game
//

'use strict';

const utils = require('../utils');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return ((request.type === 'IntentRequest')
      && (attributes.choices && (attributes.choices.length > 0))
      && ((request.intent.name === 'SelectIntent')
        || (request.intent.name === 'AMAZON.NextIntent')
        || (request.intent.name === 'AMAZON.NoIntent')));
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);
    let speech;
    let reprompt;

    // OK, pop this choice and go to the next one - if no other choices, we'll go with the last one
    attributes.choices.shift();
    if (attributes.choices.length === 1) {
      // OK, we're going with this one
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
        utils.selectGame(handlerInput, 0).then(() => {
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
    } else {
      reprompt = res.strings.LAUNCH_REPROMPT;
      attributes.temp.repromptParams.Game = utils.sayGame(event, attributes.choices[0]);
      speech = reprompt;
      Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);

      return handlerInput.responseBuilder
        .speak(utils.ri(speech, attributes.temp.speechParams))
        .reprompt(utils.ri(reprompt, attributes.temp.repromptParams))
        .getResponse();
    }
  },
};
