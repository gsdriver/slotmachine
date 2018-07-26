//
// Spins the wheel and determines the payouts!
//

'use strict';

const utils = require('../utils');
const request = require('request');
const seedrandom = require('seedrandom');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // Bet or Spin can be done while you are selecting a game
    if ((request.type === 'IntentRequest')
      && (attributes.choices && (attributes.choices.length > 0))
      && ((request.intent.name === 'BetIntent')
        || (request.intent.name === 'SpinIntent'))) {
      return true;
    }

    // You have several ways you can kick off a spin if you are not
    // in the middle of selecting a game
    return ((request.type === 'IntentRequest')
      && (!attributes.choices || !attributes.choices.length)
      && ((request.intent.name === 'ElementSelected')
        || (request.intent.name === 'GameIntent')
        || (request.intent.name === 'BetIntent')
        || (request.intent.name === 'AMAZON.YesIntent')
        || (request.intent.name === 'AMAZON.NextIntent')
        || (request.intent.name === 'SpinIntent')));
  },
  handle: function(handlerInput) {
    return new Promise((resolve, reject) => {
      selectGame(handlerInput, (welcome) => {
        const event = handlerInput.requestEnvelope;
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        const res = require('../resources')(event.request.locale);

        // When you spin, you either have to have bets or prior bets
        let speech = welcome;
        const game = attributes[attributes.currentGame];
        const rules = utils.getGame(attributes.currentGame);

        // Just in case they were trying to play at the last minute...
        attributes.temp.readingRules = false;
        if (!attributes.temp.tournamentAvailable && (attributes.currentGame == 'tournament')) {
          attributes.currentGame = 'basic';
          handlerInput.responseBuilder
            .speak(res.strings.TOURNAMENT_ENDED)
            .reprompt(res.strings.ERROR_REPROMPT);
          resolve();
          return;
        }

        const bet = getBet(event, attributes);
        game.bet = bet;
        updateBankroll(attributes, -bet);
        if (bet !== game.lastbet) {
          // Say the amount they are betting
          speech += res.strings.SPIN_YOU_BET.replace('{0}', utils.readCoins(event, bet));
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

          const randomValue = seedrandom(i + event.session.user.userId + (game.timestamp ? game.timestamp : ''))();
          spin = Math.floor(randomValue * total);
          if (spin == total) {
            spin--;
          }

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

        if (!game.result) {
          game.result = {};
        }
        game.result.spin = spinResult;
        let spinText = '<audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/pullandspin.mp3\"/> ';
        for (i = 0; i < spinResult.length; i++) {
          spinText += '<audio src="https://s3-us-west-2.amazonaws.com/alexasoundclips/slotstop.mp3"/><break time=\"200ms\"/> ';
          spinText += utils.saySymbol(event, spinResult[i]);
        }
        speech += res.strings.SPIN_RESULT.replace('{0}', spinText);

        // Now let's determine the payouts
        let matchedPayout;
        let payout;
        let outcome;

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

        game.result.payout = Math.floor(bet * (matchedPayout ? rules.payouts[matchedPayout] : 0));
        if (game.result.payout > 0) {
          // You won!  If more than 50:1, play the jackpot sound
          if (rules.payouts[matchedPayout] >= 50) {
            speech += '<audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/jackpot.mp3\"/> ';
            game.jackpot = (game.jackpot) ? (game.jackpot + 1) : 1;
            outcome = 'jackpot';

            // Write the jackpot details, UNLESS it's a progressive payout
            // in which case we'll write it out once we know the amount
            if (!(rules.progressive && (matchedPayout == rules.progressive.match)
                          && (bet == rules.maxCoins))) {
              const params = {
                url: process.env.SERVICEURL + 'slots/updateJackpot',
                formData: {
                  jackpot: bet * rules.payouts[matchedPayout],
                  game: attributes.currentGame,
                  userId: event.session.user.userId,
                },
              };
              request.post(params, (err, res, body) => {
              });
            }
          } else {
            if (rules.win) {
              speech += rules.win;
            }
            outcome = 'win';
          }

          // If you won the progressive, then ... wow, you rock!
          if (rules.progressive && (matchedPayout == rules.progressive.match)
                && (bet == rules.maxCoins)) {
            // OK, read the jackpot from the database
            utils.getProgressivePayout(attributes, (coinsWon) => {
              updateBankroll(attributes, coinsWon);
              speech += res.strings.SPIN_PROGRESSIVE_WINNER
                  .replace('{0}', utils.readCoins(event, coinsWon));

              const params = {
                url: process.env.SERVICEURL + 'slots/updateJackpot',
                formData: {
                  jackpot: coinsWon,
                  game: attributes.currentGame,
                  userId: event.session.user.userId,
                  resetProgressive: 'true',
                },
              };
              request.post(params, (err, res, body) => {
              });

              updateGamePostPayout(handlerInput, game, bet, outcome, (speechText, reprompt) => {
                speech += speechText;
                handlerInput.responseBuilder.speak(speech);
                if (reprompt) {
                  handlerInput.responseBuilder.reprompt(reprompt);
                } else {
                  handlerInput.responseBuilder.withShouldEndSession(true);
                }
                resolve();
              });
            });
            return;
          } else {
            updateBankroll(attributes, bet * rules.payouts[matchedPayout]);
            speech += res.strings.SPIN_WINNER
                .replace('{0}', utils.readPayout(event, rules, matchedPayout))
                .replace('{1}', utils.readCoins(event, bet * rules.payouts[matchedPayout]));
          }
        } else {
          // Sorry, you lost
          if (rules.lose) {
            speech += rules.lose;
          }
          speech += res.strings.SPIN_LOSER;
          outcome = 'lose';
        }

        // Update coins in the progressive (async call)
        utils.incrementProgressive(attributes, bet);
        updateGamePostPayout(handlerInput, game, bet, outcome, (speechText, reprompt) => {
          speech += speechText;
          handlerInput.responseBuilder.speak(speech);
          if (reprompt) {
            handlerInput.responseBuilder.reprompt(reprompt);
          } else {
            handlerInput.responseBuilder.withShouldEndSession(true);
          }
          resolve();
        });
      });
    });
  },
};

function updateGamePostPayout(handlerInput, game, bet, outcome, callback) {
  const event = handlerInput.requestEnvelope;
  const attributes = handlerInput.attributesManager.getSessionAttributes();
  const res = require('../resources')(event.request.locale);
  let lastbet = bet;
  let speech = '';
  let reprompt = res.strings.SPIN_PLAY_AGAIN;

  // If this is the tournament, force a save
  if (attributes.currentGame == 'tournament') {
    attributes.temp.forceSave = true;
  }

  // If you run out of coins, sorry - you need to come back tomorrow or buy more
  // Buying more is only allowed if the game doesn't have its own bankroll
  if ((game.bankroll !== undefined) && (game.bankroll < 1)) {
    // Sorry, you are out
    game.busted = true;
    attributes.currentGame = 'basic';
    speech += res.strings.SPIN_OUTOFMONEY;
    reprompt = undefined;
  } else if (attributes.bankroll < 1) {
    lastbet = undefined;
    attributes.busted = Date.now();
    speech += res.strings.SPIN_BUSTED;
    reprompt = undefined;
  } else {
    speech += res.strings.READ_BANKROLL
        .replace('{0}', utils.readCoins(event, utils.getBankroll(attributes)));
  }

  // Award achievement points
  if (!attributes.achievements) {
    attributes.achievements = {};
  }

  const now = new Date(Date.now());
  const lastPlay = new Date(game.timestamp);
  if (!game.timestamp || (lastPlay.getDate() != now.getDate())) {
    attributes.achievements.gamedaysPlayed =
      (attributes.achievements.gamedaysPlayed + 1) || 1;
    speech += res.strings.SPIN_FIRSTPLAY_ACHIEVEMENT
      .replace('{0}', utils.sayGame(event, attributes.currentGame));
  }

  if (outcome === 'jackpot') {
    // You get achievement points for that!
    attributes.achievements.jackpot = (attributes.achievements.jackpot + 1) || 1;
    speech += res.strings.SPIN_JACKPOT_ACHIEVEMENT;
  }

  if (game.result.payout >= bet) {
    attributes.winningStreak = (attributes.winningStreak + 1) || 1;
    if (attributes.winningStreak > 1) {
      attributes.streakScore = (attributes.streakScore + attributes.winningStreak)
          || attributes.winningStreak;
      speech += res.strings.SPIN_STREAK_ACHIEVEMENT
        .replace('{0}', attributes.winningStreak)
        .replace('{1}', attributes.winningStreak);
    }
  } else {
    attributes.winningStreak = 0;
  }

  // Keep track of spins
  game.timestamp = Date.now();
  game.spins = (game.spins === undefined) ? 1 : (game.spins + 1);

  // Is this a new high?
  if (game.bankroll !== undefined) {
    if (game.bankroll > game.high) {
      game.high = game.bankroll;
    }
  } else if (attributes.bankroll > attributes.high) {
    attributes.high = attributes.bankroll;
  }

  // If it's a new user, clear that state and let them know about other games
  if (attributes.newUser) {
    attributes.newUser = undefined;
    speech += res.strings.SPIN_NEWUSER;
  } else if (reprompt) {
    speech += reprompt;
  }

  // Update the color of the echo button (if present)
  if (attributes.temp.buttonId) {
    colorButton(handlerInput, (game.result.payout > 0));
  }

  game.lastbet = lastbet;
  game.bet = undefined;
  callback(speech, reprompt);
}

function colorButton(handlerInput, winner) {
  const attributes = handlerInput.attributesManager.getSessionAttributes();

  // Pulse the button based on whether they won or lost
  const buttonIdleDirective = {
    'type': 'GadgetController.SetLight',
    'version': 1,
    'targetGadgets': [attributes.temp.buttonId],
    'parameters': {
      'animations': [{
        'repeat': 1,
        'targetLights': ['1'],
        'sequence': [{
          'durationMs': 5000,
          'color': 'FFFFFF',
          'blend': true,
        }],
      }],
      'triggerEvent': 'none',
      'triggerEventTimeMs': 0,
    },
  };

  // Add to the animations array
  let i;
  for (i = 0; i < 4; i++) {
    buttonIdleDirective.parameters.animations[0].sequence.push({
      'durationMs': 400,
      'color': (winner ? '00FE10' : 'FF0000'),
      'blend': true,
    });
    buttonIdleDirective.parameters.animations[0].sequence.push({
      'durationMs': 300,
      'color': '000000',
      'blend': true,
    });
  }

  handlerInput.responseBuilder
    .addDirective(buttonIdleDirective)
    .addDirective(utils.buildButtonDownAnimationDirective(
        [attributes.temp.buttonId]));
}

function getBet(event, attributes) {
  // The bet amount is optional - if not present we will use a default value
  // of either the last bet amount or the maximum coins for the machine
  let amount;
  const bankroll = utils.getBankroll(attributes);
  const game = attributes[attributes.currentGame];
  const rules = utils.getGame(attributes.currentGame);
  const amountSlot = (event.request.intent && event.request.intent.slots
      && event.request.intent.slots.Amount);

  if (amountSlot && amountSlot.value) {
    // If the bet amount isn't an integer, we'll use the default value (1 unit)
    amount = parseInt(amountSlot.value);
  } else if (game.lastbet) {
    amount = game.lastbet;
  } else {
    amount = rules.maxCoins;
  }

  // Let's tweak the amount for them
  if (isNaN(amount) || (amount == 0)) {
    amount = 1;
  } else if (amount > rules.maxCoins) {
    amount = rules.maxCoins;
  }
  if (amount > bankroll) {
    amount = bankroll;
  }

  return amount;
}

function selectGame(handlerInput, callback) {
  const event = handlerInput.requestEnvelope;
  const attributes = handlerInput.attributesManager.getSessionAttributes();
  const res = require('../resources')(event.request.locale);
  let speech = '';

  // If they were in the midst of selecting a game, make that selection
  if (attributes.choices && (attributes.choices.length > 0)) {
    utils.selectGame(attributes, 0).then(() => {
      speech = res.strings.SELECT_WELCOME.replace('{0}', utils.sayGame(event, attributes.currentGame));

      const game = attributes[attributes.currentGame];
      const rules = utils.getGame(attributes.currentGame);
      if (rules.welcome) {
        speech += res.strings[rules.welcome];
      }

      speech += res.strings.READ_BANKROLL.replace('{0}', utils.readCoins(event, utils.getBankroll(attributes)));

      if (game.progressiveJackpot) {
        speech += res.strings.PROGRESSIVE_JACKPOT_ONLY.replace('{0}', game.progressiveJackpot);
      }
      callback(speech);
    });
  } else {
    callback(speech);
  }
}

function updateBankroll(attributes, amount) {
  const game = attributes[attributes.currentGame];
  if (game && (game.bankroll !== undefined)) {
    game.bankroll += amount;
  } else {
    attributes.bankroll += amount;
  }
}
