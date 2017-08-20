//
// Handles outside bets - red, black, high, low, even, odd, column, and dozen
//

'use strict';

const utils = require('../utils');

module.exports = {
  handleIntent: function() {
    // The bet amount is optional - if not present we will use a default value
    // of either the last bet amount or 1 unit
    let reprompt;
    let speechError;
    let ssml = '';
    let amount;
    const res = require('../' + this.event.request.locale + '/resources');
    const game = this.attributes[this.attributes.currentGame];
    const rules = utils.getGame(this.attributes.currentGame);
    const amountSlot = this.event.request.intent.slots.Amount;

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
      speechError = res.strings.BET_EXCEEDS_MAX.replace('{0}', utils.readCoins(this.event.request.locale, rules.maxCoins));
      reprompt = res.strings.BET_INVALID_REPROMPT;
    } else if (amount > game.bankroll) {
      // Oops, you can't bet this much
      speechError = res.strings.BET_EXCEEDS_BANKROLL.replace('{0}', utils.readCoins(this.event.request.locale, game.bankroll));
      reprompt = res.strings.BET_INVALID_REPROMPT;
    }

    // If there is partial speech from a previous intent, append
    if (this.attributes.partialSpeech) {
      if (speechError) {
        speechError = this.attributes.partialSpeech + speechError;
      } else {
        ssml = this.attributes.partialSpeech;
      }
      this.attributes.partialSpeech = undefined;
    }

    if (!speechError) {
      // Place the bet - clear the last one if they already bet
      if (game.bet) {
        game.bankroll += game.bet;
      }
      game.bet = amount;
      game.bankroll -= game.bet;
      reprompt = res.strings.BET_PLACED_REPROMPT;
      ssml += res.strings.BET_PLACED.replace('{0}', utils.readCoins(this.event.request.locale, amount));
      ssml += reprompt;
    }

    utils.emitResponse(this.emit, this.event.request.locale, speechError, null, ssml, reprompt);
  },
};
