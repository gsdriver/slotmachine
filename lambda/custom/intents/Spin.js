//
// Spins the wheel and determines the payouts!
//

'use strict';

const utils = require('../utils');
const request = require('request');
const seedrandom = require('seedrandom');
const buttons = require('../buttons');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const SNS = new AWS.SNS();

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // Button press counts as spin if it's a new button
    // or one that's been pressed before
    if (request.type === 'GameEngine.InputHandlerEvent') {
      const buttonId = buttons.getPressedButton(request, attributes);
      if (!attributes.temp.buttonId || (buttonId == attributes.temp.buttonId)) {
        attributes.temp.buttonId = buttonId;
        return true;
      }
    }

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
          speech = res.strings.TOURNAMENT_ENDED;
          const response = handlerInput.responseBuilder
            .speak(utils.ri(speech, attributes.temp.speechParams))
            .withShouldEndSession(true)
            .getResponse();
          resolve(response);
          return;
        }

        const bet = getBet(event, attributes);
        game.bet = bet;
        updateBankroll(attributes, -bet);
        if (bet !== game.lastbet) {
          // Say the amount they are betting
          speech += res.strings.SPIN_YOU_BET;
          attributes.temp.speechParams.AmountBet = utils.readCoins(event, bet);
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
        speech += res.strings.SPIN_RESULT;
        attributes.temp.speechParams.Result = spinText;

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

        // IF we are testing bankrupcy, then you didn't match
        if (attributes.temp.testBankrupt) {
          matchedPayout = undefined;
          attributes.temp.testBankrupt = undefined;
        }
        game.result.payout = Math.floor(bet * (matchedPayout ? rules.payouts[matchedPayout] : 0));
        attributes.temp.losingStreak = (game.result.payout === 0)
            ? ((attributes.temp.losingStreak + 1) || 1) : 0;
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
              speech += res.strings.SPIN_PROGRESSIVE_WINNER;
              attributes.temp.speechParams.AmountWon = utils.readCoins(event, coinsWon);

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

              updateGamePostPayout(handlerInput, speech, game, bet, outcome, resolve);
            });
            return;
          } else {
            updateBankroll(attributes, bet * rules.payouts[matchedPayout]);
            speech += utils.pickRandomOption(event, attributes, 'SPIN_WINNER');
            attributes.temp.speechParams.Match = utils.readPayout(event, rules, matchedPayout);
            attributes.temp.speechParams.AmountWon =
              utils.readCoins(event, bet * rules.payouts[matchedPayout]);
          }
        } else {
          // Sorry, you lost
          if (rules.lose) {
            speech += rules.lose;
          }
          if (attributes.temp.losingStreak > 5) {
            speech += utils.pickRandomOption(event, attributes, 'SPIN_BIG_LOSER');
          } else {
            speech += utils.pickRandomOption(event, attributes, 'SPIN_LOSER');
          }
          outcome = 'lose';
        }

        // Update coins in the progressive (async call)
        utils.incrementProgressive(attributes, bet);
        updateGamePostPayout(handlerInput, speech, game, bet, outcome, resolve);
      });
    });
  },
};

function updateGamePostPayout(handlerInput, partialSpeech, game, bet, outcome, callback) {
  const event = handlerInput.requestEnvelope;
  const attributes = handlerInput.attributesManager.getSessionAttributes();
  const res = require('../resources')(event.request.locale);
  let lastbet = bet;
  let speech = partialSpeech;
  let reprompt = utils.pickRandomOption(event, attributes, 'SPIN_PLAY_AGAIN');
  let snsPublication;
  let noSpeech;

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
    // If they subscribed to reset bankroll, then reset for them
    if (attributes.paid && attributes.paid.coinreset && (attributes.paid.coinreset.state == 'PURCHASED')) {
      speech += res.strings.SUBSCRIPTION_PAID_REPLENISH;
      attributes.temp.speechParams.Coins = utils.STARTING_BANKROLL;
      attributes.bankroll = utils.STARTING_BANKROLL;
    } else {
      // Publish to SNS so we know someone busted out
      if (process.env.SNSTOPIC) {
        snsPublication = {
          Message: 'User ' + event.session.user.userId + ' busted out',
          TopicArn: process.env.SNSTOPIC,
          Subject: 'Slot Machine Busted Bankroll',
        };
      }

      lastbet = undefined;
      attributes.busted = Date.now();
      if (attributes.paid && attributes.paid.coinreset) {
        noSpeech = true;
        speech += res.strings.LAUNCH_BUSTED_UPSELL;
        attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
        handlerInput.responseBuilder
          .addDirective(utils.getPurchaseDirective(attributes, 'coinreset', 'Upsell', 'subscribe.coinreset.spin',
            utils.ri(speech, attributes.temp.speechParams)));
      } else {
        speech += res.strings.SPIN_BUSTED;
        attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
      }
      reprompt = undefined;
    }
  } else {
    speech += res.strings.READ_BANKROLL;
    attributes.temp.speechParams.Amount = utils.readCoins(event, utils.getBankroll(attributes));
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
    Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);
  }

  // Update the color of the echo button (if present)
  if (attributes.temp.buttonId) {
    // Look for the first wheel sound to see if there is starting text
    // That tells us whether to have a longer or shorter length of time on the buttons
    const wheelMessage = speech.indexOf('<audio src="https://s3-us-west-2.amazonaws.com/alexasoundclips/pullandspin.mp3"/>');
    buttons.colorButton(handlerInput, attributes.temp.buttonId,
      (game.result.payout > 0) ? '00FE10' : 'FF0000', (wheelMessage > 1));
    buttons.buildButtonDownAnimationDirective(handlerInput, [attributes.temp.buttonId]);
  }

  // Set the speech
  if (!noSpeech) {
    handlerInput.responseBuilder
      .speak(utils.ri(speech, attributes.temp.speechParams));
  }
  if (reprompt) {
    handlerInput.responseBuilder
      .reprompt(utils.ri(reprompt, attributes.temp.repromptParams));
  } else {
    handlerInput.responseBuilder.withShouldEndSession(true);
  }

  // Update the leader board
  utils.updateLeaderBoard(event, attributes);
  game.lastbet = lastbet;
  game.bet = undefined;

  if (snsPublication) {
    SNS.publish(snsPublication, () => {
      callback(handlerInput.responseBuilder.getResponse());
    });
  } else {
    callback(handlerInput.responseBuilder.getResponse());
  }
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
    utils.selectGame(handlerInput, 0).then(() => {
      speech = utils.pickRandomOption(event, attributes, 'SELECT_WELCOME');
      attributes.temp.speechParams.Game = utils.sayGame(event, attributes.currentGame);

      const game = attributes[attributes.currentGame];
      const rules = utils.getGame(attributes.currentGame);
      if (rules.welcome) {
        speech += res.strings[rules.welcome];
      }

      if (game.progressiveJackpot) {
        speech += res.strings.PROGRESSIVE_JACKPOT_ONLY;
        attributes.temp.speechParams.Jackpot = game.progressiveJackpot;
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
