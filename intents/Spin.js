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
    const res = require('../' + this.event.request.locale + '/resources');
    const game = this.attributes[this.attributes.currentGame];
    const rules = utils.getGame(this.attributes.currentGame);

    if (!game.bet && !game.lastbet) {
      speechError = res.strings.SPIN_NOBETS;
      utils.emitResponse(this.emit, this.event.request.locale, speechError,
          null, speech, res.strings.SPIN_INVALID_REPROMPT);
    } else {
      if (game.bet) {
        bet = game.bet;
      } else if (game.lastbet) {
        // They want to re-use the same bets they did last time - make sure there
        // is enough left in the bankroll and update the bankroll before we spin
        if (game.lastbet > game.bankroll) {
          speechError = res.strings.SPIN_CANTBET_LASTBETS.replace('{0}', utils.readCoins(game.bankroll));
          utils.emitResponse(this.emit, this.event.request.locale,
            speechError, null, speech, res.strings.SPIN_INVALID_REPROMPT);
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
        let total = 0;

        rules.frequency[i].symbols.map((item) => {
          total = total + item;
        });
        spin = Math.floor(Math.random() * total);

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

      let spinText = '<audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/pullandspin.mp3\"/> ';

      for (i = 0; i < spinResult.length; i++) {
        spinText += '<audio src="https://s3-us-west-2.amazonaws.com/alexasoundclips/slotstop.mp3"/><break time=\"200ms\"/> ';
        spinText += res.saySymbol(spinResult[i]);
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
              // Let's see if this can substitute
              if (rules.substitutes && rules.substitutes[spinResult[i]]) {
                // It can - can it substitute for this symbol though?
                if (rules.substitutes[spinResult[i]].indexOf(slots[i]) < 0) {
                  // Nope, it doesn't substitute
                  isMatch = false;
                  break;
                }
              } else {
                isMatch = false;
                break;
              }
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

      if (matchedPayout) {
        // You won!  If more than 50:1, play the jackpot sound
        if (rules.payouts[matchedPayout] >= 50) {
          speech += '<audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/jackpot.mp3\"/> ';
          game.jackpot = (game.jackpot) ? (game.jackpot + 1) : 1;

          // Write the jackpot details, UNLESS it's a progressive payout
          // in which case we'll write it out once we know the amount
          if (!(rules.progressive && (matchedPayout == rules.progressive.match)
                        && (bet == rules.maxCoins))) {
            utils.writeJackpotDetails(this.event.session.user.userId,
                this.attributes.currentGame,
                bet * rules.payouts[matchedPayout]);
          }
        }

        // If you won the progressive, then ... wow, you rock!
        if (rules.progressive && (matchedPayout == rules.progressive.match)
              && (bet == rules.maxCoins)) {
          // OK, read the jackpot from the database
          utils.getProgressivePayout(this.attributes, (coinsWon) => {
            game.bankroll += coinsWon;
            speech += res.strings.SPIN_PROGRESSIVE_WINNER.replace('{0}', utils.readCoins(this.event.request.locale, coinsWon));
            utils.resetProgressive(this.attributes.currentGame);
            utils.writeJackpotDetails(this.event.session.user.userId,
                  this.attributes.currentGame,
                  coinsWon);
            updateGamePostPayout(this.event.request.locale, game, bet, (speechText, reprompt) => {
              speech += speechText;
              utils.emitResponse(this.emit, this.event.request.locale,
                                  null, null, speech, reprompt);
            });
          });
          return;
        } else {
          game.bankroll += (bet * rules.payouts[matchedPayout]);
          speech += res.strings.SPIN_WINNER.replace('{0}', utils.readPayout(this.event.request.locale, rules, matchedPayout)).replace('{1}', utils.readCoins(this.event.request.locale, bet * rules.payouts[matchedPayout]));
        }
      } else {
        // Sorry, you lost
        speech += res.strings.SPIN_LOSER;
      }

      // Update coins in the progressive (async call)
      utils.incrementProgressive(this.attributes, bet);
      updateGamePostPayout(this.event.request.locale, game, bet, (speechText, reprompt) => {
        speech += speechText;
        utils.emitResponse(this.emit, this.event.request.locale,
                            null, null, speech, reprompt);
      });
    }
  },
};

function updateGamePostPayout(locale, game, bet, callback) {
  const res = require('../' + locale + '/resources');
  let lastbet = bet;
  let speech = '';
  let reprompt = res.strings.SPIN_PLAY_AGAIN;

  // If they have no units left, reset the bankroll
  if (game.bankroll < 1) {
    game.bankroll = 1000;
    lastbet = undefined;
    speech += res.strings.SPIN_BUSTED;
    reprompt = res.strings.SPIN_BUSTED_REPROMPT;
  } else {
    if (game.bankroll < lastbet) {
      // They still have money left, but if they don't have enough to support
      // the last set of bets again, then reset it to 1 coin
      lastbet = 1;
    }

    speech += res.strings.READ_BANKROLL.replace('{0}', utils.readCoins(locale, game.bankroll));
  }

  // Keep track of spins
  game.timestamp = Date.now();
  game.spins = (game.spins === undefined) ? 1 : (game.spins + 1);

  // Is this a new high for this game?
  if (game.bankroll > game.high) {
    // Just track for now...
    game.high = game.bankroll;
  }

  // And reprompt
  game.lastbet = lastbet;
  game.bet = undefined;
  speech += reprompt;
  callback(speech, reprompt);
}
