//
// Spins the wheel and determines the payouts!
//

'use strict';

const utils = require('../utils');
const request = require('request');
const seedrandom = require('seedrandom');
const buttons = require('../buttons');
const ri = require('@jargon/alexa-skill-sdk').ri;

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // Button press counts as spin if it's a new button
    // or one that's been pressed before
    if ((request.type === 'GameEngine.InputHandlerEvent') &&
      !buttons.timedOut(handlerInput)) {
      const buttonId = buttons.getPressedButton(request, attributes);
      if (buttonId && (!attributes.buttonId || (buttonId == attributes.buttonId))) {
        attributes.buttonId = buttonId;
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

    // Game 99 is a special case that we don't handle
    if ((request.type === 'IntentRequest') && (request.intent.name === 'GameIntent')) {
      // It has to be game 99 that you are selecting
      if (request.intent.slots && request.intent.slots.Number
        && request.intent.slots.Number.value) {
        const game = parseInt(request.intent.slots.Number.value);
        if (game === 99) {
          return false;
        }
      }
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
    return selectGame(handlerInput).then((welcome) => {
      const event = handlerInput.requestEnvelope;
      const attributes = handlerInput.attributesManager.getSessionAttributes();

      // First off, let's see if we should do an upsell
      // We will do this if they have played this game 10 times in a row
      // during this session and we haven't done an upsell already
      attributes.temp.sameGameSpins = (attributes.temp.sameGameSpins + 1) || 1;
      if ((attributes.currentGame !== 'tournament')
        && attributes.paid && !attributes.temp.noUpsellGame
        && (attributes.temp.sameGameSpins > 10)) {
        const now = Date.now();
        let product;
        let upsellProduct;

        for (product in attributes.paid) {
          if (product && (product !== 'coinreset')
            && (attributes.paid[product].state === 'AVAILABLE')) {
            if (!attributes.prompts[product] ||
              ((now - attributes.prompts[product]) > 2*24*60*60*1000)) {
                upsellProduct = product;
            }
          }
        }

        if (upsellProduct) {
          return handlerInput.jrm.renderBatch([
            ri('GAME_LIST_' + attributes.currentGame.toUpperCase()),
            ri('GAME_LIST_' + upsellProduct.toUpperCase()),
          ])
          .then((gameNames) => {
            attributes.prompts[upsellProduct] = now;
            attributes.temp.speechParams.CurrentGame = gameNames[0];
            attributes.temp.speechParams.Game = gameNames[1];
            const renderItem = ri('SPIN_UPSELL', attributes.temp.speechParams);
            let directive;
            return handlerInput.jrm.render(renderItem).then((upsellMessage) => {
              directive = {
                'type': 'Connections.SendRequest',
                'name': 'Upsell',
                'payload': {
                  'InSkillProduct': {
                    productId: attributes.paid[upsellProduct].productId,
                  },
                  'upsellMessage': upsellMessage,
                },
                'token': 'machine.' + upsellProduct + '.spin',
              };

              // Get the variant that was returned
              return handlerInput.jrm.selectedVariation(renderItem)
              .then((variation) => {
                return variation;
              })
              .catch(() => {
                // It's OK - probably someone who changed locale
                return {key: 'SELECT_UPSELL.v8'};
              });
            }).then((variation) => {
              const options = variation.key.split('.');
              attributes.upsellSelection = options[1];

              return handlerInput.jrb.addDirective(directive)
                .withShouldEndSession(true)
                .getResponse();
            });
          });
        }
      }

      // When you spin, you either have to have bets or prior bets
      let speech = welcome;
      const game = attributes[attributes.currentGame];
      const rules = utils.getGame(attributes.currentGame);

      // Just in case they were trying to play at the last minute...
      attributes.temp.readingRules = false;
      if (!attributes.temp.tournamentAvailable && (attributes.currentGame == 'tournament')) {
        attributes.currentGame = 'basic';
        return handlerInput.jrb
          .speak(ri('TOURNAMENT_ENDED'))
          .withShouldEndSession(true)
          .getResponse();
      }

      const bet = getBet(event, attributes);
      game.bet = bet;
      updateBankroll(attributes, -bet);
      if (bet !== game.lastbet) {
        // Say the amount they are betting
        speech += '_BET';
        attributes.temp.speechParams.AmountBet = bet;
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
        spinText += attributes.temp.symbolList[spinResult[i]];
      }
      attributes.temp.speechParams.SpinResult = spinText;

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
        speech += '_WIN';
        if (rules.payouts[matchedPayout] >= 50) {
          game.jackpot = (game.jackpot) ? (game.jackpot + 1) : 1;
          outcome = 'jackpot';

          // Write the jackpot details, UNLESS it's a progressive payout
          // in which case we'll write it out once we know the amount
          if (!(rules.progressive && (matchedPayout == rules.progressive.match)
                        && (bet == rules.maxCoins))) {
            speech += '_JACKPOT';
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
            attributes.temp.speechParams.SpinResult += rules.win;
          }
          outcome = 'win';
        }

        // If you won the progressive, then ... wow, you rock!
        if (rules.progressive && (matchedPayout == rules.progressive.match)
              && (bet == rules.maxCoins)) {
          // OK, read the jackpot from the database
          return utils.getProgressivePayout(attributes).then((coinsWon) => {
            updateBankroll(attributes, coinsWon);
            speech += '_PROGRESSIVE';
            attributes.temp.speechParams.AmountWon = coinsWon;

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

            return updateGamePostPayout(handlerInput, speech, game, bet, outcome);
          });
        } else {
          updateBankroll(attributes, bet * rules.payouts[matchedPayout]);
          attributes.temp.speechParams.Match =
            utils.readPayout(handlerInput, rules, matchedPayout);
          attributes.temp.speechParams.AmountWon =
            bet * rules.payouts[matchedPayout];
        }
      } else {
        // Sorry, you lost
        if (rules.lose) {
          attributes.temp.speechParams.SpinResult += rules.lose;
        }
        speech += '_LOSER';
        if (attributes.temp.losingStreak > 5) {
          speech += '_BIG';
        }
        outcome = 'lose';
      }

      // Update coins in the progressive (async call)
      utils.incrementProgressive(attributes, bet);
      return updateGamePostPayout(handlerInput, speech, game, bet, outcome);
    });
  },
};

function updateGamePostPayout(handlerInput, partialSpeech, game, bet, outcome) {
  const event = handlerInput.requestEnvelope;
  const attributes = handlerInput.attributesManager.getSessionAttributes();
  let lastbet = bet;
  let speech = partialSpeech;

  // If this is the tournament, force a save
  if (attributes.currentGame == 'tournament') {
    attributes.temp.forceSave = true;
  }

  // Keep track of spins
  game.timestamp = Date.now();
  game.spins = (game.spins === undefined) ? 1 : (game.spins + 1);

  // If you run out of coins, sorry - you need to come back tomorrow or buy more
  // Buying more is only allowed if the game doesn't have its own bankroll
  if ((game.bankroll !== undefined) && (game.bankroll < 1)) {
    // Sorry, you are out
    game.busted = true;
    attributes.currentGame = 'basic';
    speech += '_BUSTED_OUTOFMONEY';
    return handlerInput.jrb
      .speak(ri(speech, attributes.temp.speechParams))
      .withShouldEndSession(true)
      .getResponse();
  } else if (attributes.bankroll < 1) {
    // If they subscribed to reset bankroll, then reset for them
    speech += '_BUSTED';

    if (attributes.paid && attributes.paid.coinreset && (attributes.paid.coinreset.state == 'PURCHASED')) {
      speech += '_SUBSCRIBED_REPLENISH';
      attributes.temp.speechParams.Coins = utils.STARTING_BANKROLL;
      attributes.bankroll = utils.STARTING_BANKROLL;
    } else {
      lastbet = undefined;
      attributes.busted = Date.now();
      if (attributes.paid && attributes.paid.coinreset) {
        speech += '_UPSELL';
        attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;

        return handlerInput.jrm.renderObject(ri(speech, attributes.temp.speechParams))
        .then((directive) => {
          directive.payload.InSkillProduct.productId = attributes.paid.coinreset.productId;
          handlerInput.jrb.addDirective(directive).getResponse();
          return handlerInput.jrb.withShouldEndSession(true).getResponse();
        });
      } else {
        attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
        return handlerInput.jrb
          .speak(ri(speech, attributes.temp.speechParams))
          .withShouldEndSession(true)
          .getResponse();
      }
    }
  } else {
    attributes.temp.speechParams.Amount = utils.getBankroll(attributes);
  }

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
    speech += '_NEWUSER';
  }

  return handlerInput.jrm.renderBatch([
    ri(speech, attributes.temp.speechParams),
    ri('SPIN_PLAY_AGAIN'),
  ])
  .then((resolvedSpeech) => {
    // If this machine replaces the slotstop sound, do the replacement now
    const rules = utils.getGame(attributes.currentGame);
    if (rules.stopreplace) {
      resolvedSpeech[0] = resolvedSpeech[0].replace(/slotstop/g, rules.stopreplace);
    }

    // If this locale supports Echo buttons and the customer is using a button
    // or has a display screen, we will use the GameEngine
    // to control display and reprompting
    if (buttons.supportButtons(handlerInput) && (attributes.buttonId || attributes.display)) {
      // Update the color of the echo button (if present)
      // Look for the first wheel sound to see if there is starting text
      // That tells us whether to have a longer or shorter length of time on the buttons
      const timeoutLength = utils.estimateDuration(resolvedSpeech[0])
        - utils.estimateDuration(resolvedSpeech[0].substring(resolvedSpeech[0].lastIndexOf('>') + 1));
      attributes.temp.spinColor = (game.result.payout > 0) ? '00FE10' : 'FF0000';
      buttons.colorDuringSpin(handlerInput, attributes.buttonId);
      buttons.buildButtonDownAnimationDirective(handlerInput, [attributes.buttonId]);
      buttons.setInputHandlerAfterSpin(handlerInput, timeoutLength);
      console.log('Setting timeout of ' + timeoutLength + 'ms');
      handlerInput.jrb.withShouldEndSession(false);
    }

    // Update the leader board
    utils.updateLeaderBoard(event, attributes);
    game.lastbet = lastbet;
    game.bet = undefined;
    return handlerInput.responseBuilder
      .speak(resolvedSpeech[0])
      .reprompt(resolvedSpeech[1])
      .getResponse();
  });
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

function selectGame(handlerInput) {
  const attributes = handlerInput.attributesManager.getSessionAttributes();
  let speech;

  // If they were in the midst of selecting a game, make that selection
  if (attributes.choices && (attributes.choices.length > 0)) {
    return utils.selectGame(handlerInput, 0).then(() => {
      speech = 'SPIN_JOINGAME';
      return handlerInput.jrm.render(ri('GAME_LIST_' + attributes.currentGame.toUpperCase()));
    }).then((gameName) => {
      attributes.temp.speechParams.Game = gameName;
      const rules = utils.getGame(attributes.currentGame);

      if (rules.welcome) {
        return handlerInput.jrm.render(ri(rules.welcome));
      } else {
        return '';
      }
    }).then((text) => {
      attributes.temp.speechParams.GameWelcome = text;
      const game = attributes[attributes.currentGame];
      if (game.progressiveJackpot) {
        speech += '_PROGRESSIVE';
        attributes.temp.speechParams.Jackpot = game.progressiveJackpot;
      }
      return speech;
    });
  } else {
    return Promise.resolve('SPIN');
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
