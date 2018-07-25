//
// Spins the wheel and determines the payouts!
//

'use strict';

const utils = require('../utils');
const request = require('request');
const seedrandom = require('seedrandom');
const buttons = require('../buttons');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return ((request.type === 'IntentRequest')
      && (!attributes.choices || !attributes.choices.length)
      && ((request.intent.name === 'ElementSelected')
        || (request.intent.name === 'GameIntent')
        || (request.intent.name === 'AMAZON.YesIntent')
        || (request.intent.name === 'AMAZON.NextIntent')
        || (request.intent.name === 'SpinIntent')));
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);

    // When you spin, you either have to have bets or prior bets
    let bet;
    let speechError = '';
    let speech = '';
    const game = attributes[attributes.currentGame];
    const rules = utils.getGame(attributes.currentGame);

    // Just in case they were trying to play at the last minute...
    attributes.temp.readingRules = false;
    if (!attributes.temp.tournamentAvailable && (attributes.currentGame == 'tournament')) {
      attributes.currentGame = 'basic';
      handlerInput.responseBuilder
        .speak(res.strings.TOURNAMENT_ENDED)
        .reprompt(res.strings.ERROR_REPROMPT);
      return;
    }

    // If there is partial speech from a previous intent, append
    if (attributes.partialSpeech) {
      speechError = attributes.partialSpeech;
      speech = attributes.partialSpeech;
      attributes.partialSpeech = undefined;
    }

    if (!game.bet && !game.lastbet) {
      // Either bet the max coins or their available bankroll
      bet = Math.min(rules.maxCoins, game.bankroll);
      game.bet = bet;
      game.bankroll -= bet;
    } else {
      if (game.bet) {
        bet = game.bet;
      } else if (game.lastbet) {
        // They want to re-use the same bets they did last time - make sure there
        // is enough left in the bankroll and update the bankroll before we spin
        if (game.lastbet > game.bankroll) {
          speechError += res.strings.SPIN_CANTBET_LASTBETS.replace('{0}', utils.readCoins(event, game.bankroll));
          handlerInput.responseBuilder
            .speak(speechError)
            .reprompt(res.strings.SPIN_INVALID_REPROMPT);
          return;
        } else {
          bet = game.lastbet;
          game.bankroll -= game.lastbet;
        }
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
        return new Promise((resolve, reject) => {
          // OK, read the jackpot from the database
          utils.getProgressivePayout(attributes, (coinsWon) => {
            game.bankroll += coinsWon;
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

            updateGamePostPayout(event, attributes, game, bet, outcome, (speechText, reprompt) => {
              speech += speechText;
              handlerInput.responseBuilder
                .speak(speech)
                .reprompt(reprompt);
              resolve();
            });
          });
        });
      } else {
        game.bankroll += (bet * rules.payouts[matchedPayout]);
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
    updateGamePostPayout(event, attributes, game, bet, outcome, (speechText, reprompt) => {
      speech += speechText;
      handlerInput.responseBuilder
        .speak(speech)
        .reprompt(reprompt);
    });
  },
};

function updateGamePostPayout(event, attributes, game, bet, outcome, callback) {
  let lastbet = bet;
  let speech = '';
  const res = require('../resources')(event.request.locale);
  let reprompt = res.strings.SPIN_PLAY_AGAIN;
  const rules = utils.getGame(attributes.currentGame);

  // If this is the tournament, force a save
  if (attributes.currentGame == 'tournament') {
    attributes.temp.forceSave = true;
  }

  // If they have no units left, reset the bankroll
  // unless this is tournament mode in which case - sorry you're out
  if (game.bankroll < 1) {
    if (!rules.canReset) {
      // Sorry, you are out
      game.busted = true;
      attributes.currentGame = 'basic';
      speech += res.strings.SPIN_OUTOFMONEY;
      reprompt = res.strings.SPIN_BUSTED_REPROMPT;
    } else {
      game.bankroll = 1000;
      lastbet = undefined;
      speech += res.strings.SPIN_BUSTED;
      reprompt = res.strings.SPIN_BUSTED_REPROMPT;
    }
  } else {
    if (game.bankroll < lastbet) {
      // They still have money left, but if they don't have enough to support
      // the last set of bets again, then reset it to 1 coin
      lastbet = 1;
    }

    speech += res.strings.READ_BANKROLL
        .replace('{0}', utils.readCoins(event, game.bankroll));
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

  // Is this a new high for this game?
  if (game.bankroll > game.high) {
    // Just track for now...
    game.high = game.bankroll;
  }

  // If it's a new user, clear that state and let them know about other games
  if (attributes.newUser) {
    attributes.newUser = undefined;
    speech += res.strings.SPIN_NEWUSER;
  } else {
    speech += reprompt;
  }

  // Update the color of the echo button (if present)
  buttons.turnOffButtons(context);
  if (attributes.temp.buttonId) {
    // Look for the first wheel sound to see if there is starting text
    // That tells us whether to have a longer or shorter length of time on the buttons
    const wheelMessage = speech.indexOf('<audio src="https://s3-us-west-2.amazonaws.com/alexasoundclips/pullandspin.mp3"/>');
    buttons.colorButton(context, attributes.temp.buttonId,
      (game.result.payout > 0) ? '00FE10' : 'FF0000', (wheelMessage > 1));
    buttons.buildButtonDownAnimationDirective(context, [attributes.temp.buttonId]);
  }

  // And reprompt
  game.lastbet = lastbet;
  game.bet = undefined;
  callback(speech, reprompt);
}

function colorButton(handlerInput, winner) {
  // Pulse the button based on whether they won or lost
  const buttonIdleDirective = {
    'type': 'GadgetController.SetLight',
    'version': 1,
    'targetGadgets': [context.attributes.temp.buttonId],
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
        [context.attributes.temp.buttonId]));
}
