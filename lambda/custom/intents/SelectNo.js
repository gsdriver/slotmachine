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

    // OK, pop this choice and go to the next one - if no other choices, we'll go with the last one
    attributes.choices.shift();
    if (attributes.choices.length === 1) {
      // OK, we're going with this one
      let speech;

      // Just in case they were trying to play at the last minute...
      if (!attributes.temp.tournamentAvailable && (attributes.currentGame == 'tournament')) {
        attributes.currentGame = 'basic';
        handlerInput.responseBuilder
          .speak(res.strings.TOURNAMENT_ENDED)
          .reprompt(res.strings.ERROR_REPROMPT);
        return;
      }

      attributes.currentGame = attributes.choices[0];
      attributes.choices = undefined;
      attributes.originalChoices = undefined;
      speech = res.strings.SELECT_WELCOME.replace('{0}', utils.sayGame(event, attributes.currentGame));

      if (!attributes[attributes.currentGame]) {
        attributes[attributes.currentGame] = {
          bankroll: 1000,
          high: 1000,
        };

        // If this is tournament, keep track of number of tournaments played
        if (attributes.currentGame == 'tournament') {
          attributes.tournamentsPlayed = (attributes.tournamentsPlayed + 1) || 1;
        }
      }

      const game = attributes[attributes.currentGame];
      const rules = utils.getGame(attributes.currentGame);
      const reprompt = res.strings.SELECT_REPROMPT.replace('{0}', rules.maxCoins);

      if (rules.welcome) {
        speech += res.strings[rules.welcome];
      }

      return new Promise((resolve, reject) => {
        // Check if there is a progressive jackpot
        utils.getProgressivePayout(attributes, (jackpot) => {
          speech += res.strings.READ_BANKROLL.replace('{0}', utils.readCoins(event, game.bankroll));

          if (jackpot) {
            // For progressive, just tell them the jackpot and to bet max coins
            speech += res.strings.PROGRESSIVE_JACKPOT.replace('{0}', jackpot).replace('{1}', rules.maxCoins);
            game.progressiveJackpot = jackpot;
          } else {
            speech += reprompt;
          }
          handlerInput.responseBuilder
            .speak(speech)
            .reprompt(reprompt);
          resolve();
        });
      });
    } else {
      const speech = res.strings.LAUNCH_REPROMPT.replace('{0}', utils.sayGame(event, attributes.choices[0]));

      handlerInput.responseBuilder
        .speak(speech)
        .reprompt(speech);
    }
  },
};
