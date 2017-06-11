//
// Spins the wheel and determines the payouts!
//

'use strict';

const utils = require('../utils');

module.exports = {
  handleIntent: function() {
    // When you spin, you either have to have bets or prior bets
    let bet;
    let speechError;
    let speech = '';
    let reprompt;
    const res = require('../' + this.event.request.locale + '/resources');
    const game = this.attributes[this.attributes.currentGame];
    const rules = utils.getGame(this.attributes.currentGame);

    if (!game.bet && !game.lastbet) {
      speechError = res.strings.SPIN_NOBETS;
      reprompt = res.strings.SPIN_INVALID_REPROMPT;
      utils.emitResponse(this.emit, this.event.request.locale, speechError, null, speech, reprompt);
    } else {
      if (game.bet) {
        bet = game.bet;
      } else if (game.lastbet) {
        // They want to re-use the same bets they did last time - make sure there
        // is enough left in the bankroll and update the bankroll before we spin
        if (game.lastbet > game.bankroll) {
          speechError = res.strings.SPIN_CANTBET_LASTBETS.replace('{0}', utils.readCoins(game.bankroll));
          reprompt = res.strings.SPIN_INVALID_REPROMPT;
          utils.emitResponse(this.emit, this.event.request.locale,
            speechError, null, speech, reprompt);
          return;
        } else {
          bet = game.lastbet;
          game.bankroll -= game.lastbet;
        }
      }

      // Pick random numbers based on the rules of the game
      const spinResult = [];
      let i;

      for (i = 0; i < rules.slots; i++) {
        let spin;
        let j;

        spin = Math.floor(Math.random() * rules.frequency[i].total);

        for (j = 0; j < rules.frequency[i].symbols.length; j++) {
          if (spin < rules.frequency[i].symbols[j]) {
            // This is it!
            spinResult.push(rules.symbols[j]);
            break;
          }

          // Nope, go to the next one
          spin -= rules.frequency[i].symbols[j];
        }
      }

      let spinText = '';

      for (i = 0; i < spinResult.length; i++) {
        spinText += res.saySymbol(spinResult[i]);
        if (i < spinResult.length - 1) {
          spinText += ' ';
        }
      }
      speech += res.strings.SPIN_RESULT.replace('{0}', spinText);

      // Now let's determine the payouts
      let matchedPayout;
      let payout;

      for (payout in rules.payouts) {
        if (payout) {
          const slots = payout.split('|');
          let i;
          let isMatch = true;

          for (i = 0; i < slots.length; i++) {
            if (slots[i] !== spinResult[i]) {
              isMatch = false;
              break;
            }
          }

          if (isMatch) {
            if (matchedPayout) {
              // Is this one better?
              if (rules.payouts[payout] > rules.payouts[matchedPayout]) {
                matchedPayout = payout;
              }
            } else {
              matchedPayout = payout;
            }
          }
        }
      }

      game.lastbet = bet;
      game.bet = undefined;

      if (matchedPayout) {
        // You won!
        game.bankroll += (bet * rules.payouts[matchedPayout]);
        speech += res.strings.SPIN_WINNER.replace('{0}', utils.readPayout(this.event.request.locale, rules, matchedPayout)).replace('{1}', utils.readCoins(this.event.request.locale, bet * rules.payouts[matchedPayout]));
      } else {
        // Sorry, you lost
        speech += res.strings.SPIN_LOSER;
      }

      // And reprompt
      reprompt = res.strings.SPIN_PLAY_AGAIN;
      speech += reprompt;
      utils.emitResponse(this.emit, this.event.request.locale, speechError, null, speech, reprompt);
    }
  },
};
