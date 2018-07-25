//
// Handles outside bets - red, black, high, low, even, odd, column, and dozen
//

'use strict';

const utils = require('../utils');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return ((request.type === 'IntentRequest') && (request.intent.name === 'BetIntent')
      && (!attributes.choices || !attributes.choices.length));
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);

    // The bet amount is optional - if not present we will use a default value
    // of either the last bet amount or 1 unit
    let reprompt;
    let speechError;
    let ssml = '';
    let amount;
    const game = attributes[attributes.currentGame];
    const rules = utils.getGame(attributes.currentGame);
    const amountSlot = event.request.intent.slots.Amount;

    attributes.temp.readingRules = false;
    if (!attributes.temp.tournamentAvailable && (attributes.currentGame == 'tournament')) {
      attributes.currentGame = 'basic';
      handlerInput.responseBuilder
        .speak(res.strings.TOURNAMENT_ENDED)
        .reprompt(res.strings.ERROR_REPROMPT);
      return;
    }

    // Default to one coin
    if (amountSlot && amountSlot.value) {
      // If the bet amount isn't an integer, we'll use the default value (1 unit)
      amount = parseInt(amountSlot.value);
    } else if (game.lastbet) {
      amount = game.lastbet;
    } else {
      amount = 1;
    }

    if (isNaN(amount) || (amount == 0)) {
      speechError = res.strings.BET_INVALID_AMOUNT.replace('{0}', amount);
      reprompt = res.strings.BET_INVALID_REPROMPT;
    } else if (amount > rules.maxCoins) {
      speechError = res.strings.BET_EXCEEDS_MAX.replace('{0}', utils.readCoins(event, rules.maxCoins));
      reprompt = res.strings.BET_INVALID_REPROMPT;
    } else if (amount > game.bankroll) {
      // Oops, you can't bet this much
      speechError = res.strings.BET_EXCEEDS_BANKROLL.replace('{0}', utils.readCoins(event, game.bankroll));
      reprompt = res.strings.BET_INVALID_REPROMPT;
    }

    // If there is partial speech from a previous intent, append
    if (attributes.partialSpeech) {
      if (speechError) {
        speechError = attributes.partialSpeech + speechError;
      } else {
        ssml = attributes.partialSpeech;
      }
      attributes.partialSpeech = undefined;
    }

    if (!speechError) {
      // Place the bet - clear the last one if they already bet
      if (game.bet) {
        game.bankroll += game.bet;
      }
      game.bet = amount;
      game.bankroll -= game.bet;
      reprompt = res.strings.BET_PLACED_REPROMPT;
      ssml += res.strings.BET_PLACED.replace('{0}', utils.readCoins(event, amount));
      ssml += reprompt;
    } else {
      ssml = speechError;
    }

    handlerInput.responseBuilder
      .speak(ssml)
      .reprompt(reprompt);
  },
};
