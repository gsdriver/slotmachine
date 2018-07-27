//
// Handles opening the skill
//

'use strict';

const utils = require('../utils');

module.exports = {
  canHandle: function(handlerInput) {
    return handlerInput.requestEnvelope.session.new ||
      (handlerInput.requestEnvelope.request.type === 'LaunchRequest');
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    return new Promise((resolve, reject) => {
      ms.getInSkillProducts(handlerInput.requestEnvelope.request.locale)
      .then((result) => {
        if (Array.isArray(result.inSkillProducts)) {
          if (!attributes.paid) {
            attributes.paid = {};
          }

          result.inSkillProducts.forEach((product) => {
            attributes.paid[product.referenceName] = {
              productId: product.productId,
              state: (product.entitled == 'ENTITLED') ? 'PURCHASED' : 'AVAILABLE',
            };
          });
        }
      })
      .catch((err) => {
        console.log('Error getting in skill products: ' + err);
      });

      if (process.env.TESTCOINS) {
        attributes.paid = {coins: {
          productId: '12',
          state: 'PURCHASED',
        }};
      }

      let speech = '';
      if (attributes.tournamentResult) {
        speech += attributes.tournamentResult;
        attributes.tournamentResult = undefined;
      }

      // First off - are they out of money?
      if (attributes.busted) {
        if (attributes.paid && attributes.paid.coins && (attributes.paid.coins.state == 'PURCHASED')) {
          speech += res.strings.SUBSCRIPTION_PAID_REPLENISH.replace('{0}', utils.STARTING_BANKROLL);
          attributes.bankroll += utils.STARTING_BANKROLL;
          attributes.busted = undefined;
        } else {
          // Is it the next day or not?
          let nextDay = false;
          const now = Date.now();

          if ((now - attributes.busted) > 24*60*60*1000) {
            nextDay = true;
          } else {
            // Convert to PST to see if it's next day
            const d = new Date(now);
            const b = new Date(attributes.busted);
            d.setHours(d.getHours() - 7);
            b.setHours(b.getHours() - 7);
            nextDay = (b.getDay() !== d.getDay());
          }

          if (!nextDay) {
            // Here's the place to do an upsell if we can!
            if (!attributes.temp.noUpsell && attributes.paid && attributes.paid.coins) {
              handlerInput.responseBuilder
                .addDirective(utils.getPurchaseDirective(attributes, 'Upsell',
                  res.strings.LAUNCH_BUSTED_UPSELL.replace('{0}', utils.STARTING_BANKROLL)))
                .withShouldEndSession(true);
              resolve();
            } else {
              speech += res.strings.LAUNCH_BUSTED.replace('{0}', utils.REFRESH_BANKROLL);
              handlerInput.responseBuilder
                .speak(speech)
                .withShouldEndSession(true);
              resolve();
            }
            return;
          } else {
            speech += res.strings.LAUNCH_BUSTED_REPLENISH.replace('{0}', utils.REFRESH_BANKROLL);
            attributes.bankroll += utils.REFRESH_BANKROLL;
            attributes.busted = undefined;
          }
        }
      }

      // For a new user, just tell them to bet or say spin (which places a bet)
      addButtons(handlerInput);
      if (attributes.newUser) {
        handlerInput.responseBuilder
          .speak(res.strings.LAUNCH_NEWUSER)
          .reprompt(res.strings.LAUNCH_NEWUSER_REPROMPT);
      } else {
        speech += res.strings.LAUNCH_WELCOME;

        // Read the available games then prompt for each one
        const availableGames = utils.readAvailableGames(event, attributes, true);
        if (availableGames.choices.indexOf('tournament') > -1) {
          speech = res.strings.LAUNCH_WELCOME_TOURNAMENT
            .replace('{0}', utils.getRemainingTournamentTime(event));
        } else {
          speech += availableGames.speech;
        }
        attributes.choices = availableGames.choices;
        attributes.originalChoices = availableGames.choices;

        // Ask for the first one
        const reprompt = res.strings.LAUNCH_REPROMPT
          .replace('{0}', utils.sayGame(event, availableGames.choices[0]));
        speech += reprompt;
        handlerInput.responseBuilder
          .speak(speech)
          .reprompt(reprompt);
        resolve();
      }
    });
  },
};

function addButtons(handlerInput) {
  // Build idle breathing animation that will play immediately
  // and button down animation for when the button is pressed
  utils.startButtonInput(handlerInput);
  const breathAnimation = buildBreathAnimation('000000', 'FFFFFF', 30, 1200);
  const idleDirective = {
    'type': 'GadgetController.SetLight',
    'version': 1,
    'targetGadgets': [],
    'parameters': {
      'animations': [{
        'repeat': 100,
        'targetLights': ['1'],
        'sequence': breathAnimation,
      }],
      'triggerEvent': 'none',
      'triggerEventTimeMs': 0,
    },
  };

  handlerInput.responseBuilder
    .addDirective(idleDirective)
    .addDirective(utils.buildButtonDownAnimationDirective([]));
}

function buildBreathAnimation(fromRgbHex, toRgbHex, steps, totalDuration) {
  const halfSteps = steps / 2;
  const halfTotalDuration = totalDuration / 2;
  return buildSeqentialAnimation(fromRgbHex, toRgbHex, halfSteps, halfTotalDuration)
    .concat(buildSeqentialAnimation(toRgbHex, fromRgbHex, halfSteps, halfTotalDuration));
};

function buildSeqentialAnimation(fromRgbHex, toRgbHex, steps, totalDuration) {
  const fromRgb = parseInt(fromRgbHex, 16);
  let fromRed = fromRgb >> 16;
  let fromGreen = (fromRgb & 0xff00) >> 8;
  let fromBlue = fromRgb & 0xff;

  const toRgb = parseInt(toRgbHex, 16);
  const toRed = toRgb >> 16;
  const toGreen = (toRgb & 0xff00) >> 8;
  const toBlue = toRgb & 0xff;

  const deltaRed = (toRed - fromRed) / steps;
  const deltaGreen = (toGreen - fromGreen) / steps;
  const deltaBlue = (toBlue - fromBlue) / steps;

  const oneStepDuration = Math.floor(totalDuration / steps);

  const result = [];

  for (let i = 0; i < steps; i++) {
    result.push({
      'durationMs': oneStepDuration,
      'color': '' + n2h(fromRed) + n2h(fromGreen) + n2h(fromBlue),
      'intensity': 255,
      'blend': true,
    });
    fromRed += deltaRed;
    fromGreen += deltaGreen;
    fromBlue += deltaBlue;
  }

  return result;
};

// number to hex with leading zeroes
function n2h(n) {
  return ('00' + (Math.floor(n)).toString(16)).substr(-2);
};
