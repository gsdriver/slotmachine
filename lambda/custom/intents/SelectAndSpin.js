//
// Handles selecting a game
//

'use strict';

const utils = require('../utils');
const Bet = require('./Bet');
const Spin = require('./Spin');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return ((request.type === 'IntentRequest')
      && (attributes.choices && (attributes.choices.length > 0))
      && ((request.intent.name === 'BetIntent')
        || (request.intent.name === 'SpinIntent')));
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);
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

    if (rules.welcome) {
      speech += res.strings[rules.welcome];
    }

    // Check if there is a progressive jackpot
    return new Promise((resolve, reject) => {
      utils.getProgressivePayout(attributes, (jackpot) => {
        speech += res.strings.READ_BANKROLL.replace('{0}', utils.readCoins(event, game.bankroll));

        if (jackpot) {
          speech += res.strings.PROGRESSIVE_JACKPOT_ONLY.replace('{0}', jackpot);
          game.progressiveJackpot = jackpot;
        }
        attributes.partialSpeech = speech;
        if (event.request.intent.name === 'BetIntent') {
          Bet.handle(handlerInput);
        } else {
          Spin.handle(handlerInput);
        }
        resolve();
      });
    });
  },
};
