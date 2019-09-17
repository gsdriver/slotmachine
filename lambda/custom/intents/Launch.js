//
// Handles opening the skill
//

'use strict';

const utils = require('../utils');
const buttons = require('../buttons');
const upsell = require('../upsell/UpsellEngine');
const Spin = require('./Spin');
const ri = require('@jargon/alexa-skill-sdk').ri;

module.exports = {
  canHandle: function(handlerInput) {
    return handlerInput.requestEnvelope.session.new ||
      (handlerInput.requestEnvelope.request.type === 'LaunchRequest');
  },
  async handle(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    let response;
    let speech = 'LAUNCH';
    let passthruPromise;

    return utils.getGreeting(handlerInput)
    .then((greeting) => {
      attributes.temp.speechParams.Greeting = greeting;
      const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
      return ms.getInSkillProducts(event.request.locale)
      .then((inSkillProductInfo) => {
        attributes.temp.inSkillProductInfo = inSkillProductInfo;
      })
      .catch((error) => {
        // Ignore errors
      });
    }).then(async function() {
      console.log('isp', attributes.temp.inSkillProductInfo);
      if (attributes.temp.inSkillProductInfo) {
        let state;
        attributes.paid = {};
        attributes.temp.inSkillProductInfo.inSkillProducts.forEach((product) => {
          if (product.entitled === 'ENTITLED') {
            state = 'PURCHASED';
          } else if (product.purchasable == 'PURCHASABLE') {
            state = 'AVAILABLE';
          }

          if (state) {
            attributes.paid[product.referenceName] = {
              productId: product.productId,
              state: state,
            };
          }
        });
        attributes.temp.inSkillProductInfo = undefined;
      }

      // OK - now that we got the ISP information - if they are a new user, let's bucket them
      if (attributes.newUser) {
        if (!attributes.tests) {
          attributes.tests = {};
        }
        attributes.tests.newUserSpin = getTestBucket(handlerInput);
        console.log('New user bucket', attributes.tests.newUserSpin);
        if (attributes.tests.newUserSpin === 'A') {
          // We are going to go right into a spin
          attributes.temp.forceWin = true;
          passthruPromise = true;
          return Spin.handle(handlerInput);
        }
      }

      // Check to see if we should upsell
      // Don't upsell if the tournament is available or there is a result
      if (!attributes.temp.resumeGame
        && !attributes.temp.tournamentAvailable
        && !(attributes.tournamentResult && (attributes.tournamentResult.length > 0))) {
        const directive = await upsell.evaluateTrigger(handlerInput.requestEnvelope.session.user.userId, 'launch');
        if (directive) {
          directive.token = 'machine.' + directive.token + '.launch';
          response = handlerInput.responseBuilder
            .addDirective(directive)
            .withShouldEndSession(true)
            .getResponse();
          return 'exit';
        }
      }

      // First off - are they out of money?
      attributes.temp.speechParams.TournamentResult = attributes.tournamentResult;
      if (attributes.busted) {
        if (attributes.paid && attributes.paid.coinreset && (attributes.paid.coinreset.state == 'PURCHASED')) {
          speech += '_BUSTED_SUBSCRIBED';
          attributes.temp.speechParams.Coins = utils.STARTING_BANKROLL;
          attributes.bankroll += utils.STARTING_BANKROLL;
          attributes.busted = undefined;
          return 'nobust';
        } else if (attributes.temp.tournamentAvailable) {
          // If the tournament is available, we'll throw 5 coins at you to play
          speech += '_BUSTED';
          attributes.bankroll += 5;
          attributes.busted = undefined;
          return 'nobust';
        } else {
          // Is it the next day or not?
          return utils.isNextDay(handlerInput);
        }
      } else {
        return 'nobust';
      }
    }).then((nextDay) => {
      if (passthruPromise) {
        return nextDay;
      }
      if (nextDay === 'nobust') {
        return 'continue';
      } else if (nextDay === 'exit') {
        return 'exit';
      } else if (!nextDay) {
        // Here's the place to do an upsell if we can!
        if (!attributes.temp.noUpsell && attributes.paid && attributes.paid.coinreset) {
          speech += '_BUSTED_UPSELL';
          attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
          return handlerInput.jrm.renderObject(ri(speech, attributes.temp.speechParams));
        } else {
          speech += '_BUSTED';
          attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
          response = handlerInput.jrb
            .speak(ri(speech, attributes.temp.speechParams))
            .withShouldEndSession(true)
            .getResponse();
          return 'exit';
        }
      } else {
        speech += '_BUSTED_REPLENISH';
        attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
        attributes.bankroll += utils.REFRESH_BANKROLL;
        attributes.busted = undefined;
        return 'continue';
      }
    }).then((directive) => {
      if (passthruPromise) {
        return directive;
      }
      if (typeof directive !== 'string') {
        directive.payload.InSkillProduct.productId = attributes.paid.coinreset.productId;
        handlerInput.jrb.addDirective(directive);
        response = handlerInput.jrb
          .withShouldEndSession(true)
          .getResponse();
        return 'exit';
      } else {
        return directive;
      }
    }).then((action) => {
      if (passthruPromise) {
        return action;
      }
      if (action === 'continue') {
        // Set up the buttons to all flash, welcoming the user to press a button
        attributes.buttonId = undefined;
        buttons.addLaunchAnimation(handlerInput);
        buttons.buildButtonDownAnimationDirective(handlerInput, []);
        buttons.startInputHandler(handlerInput, 20000);

        // For a new user, just tell them to bet or say spin (which places a bet)
        if (attributes.newUser) {
          speech = mentionButton(handlerInput)
            ? 'LAUNCH_NEWUSER_BUTTON'
            : 'LAUNCH_NEWUSER';
          response = handlerInput.jrb
            .speak(ri(speech, attributes.temp.speechParams))
            .reprompt(ri('LAUNCH_NEWUSER_REPROMPT'))
            .getResponse();
          return 'continue';
        } else if (attributes.temp.resumeGame) {
          speech = (mentionButton(handlerInput))
            ? 'LAUNCH_RESUME_GAME_BUTTON'
            : 'LAUNCH_RESUME_GAME';
          attributes.temp.resumeGame = undefined;
          response = handlerInput.jrb
            .speak(ri(speech, attributes.temp.speechParams))
            .reprompt(ri('LAUNCH_RESUME_GAME_REPROMPT'))
            .getResponse();
          return 'continue';
        } else {
          // Read the available games then prompt for each one
          return utils.readAvailableGames(handlerInput, true);
        }
      } else {
        return 'exit';
      }
    }).then((availableGames) => {
      if (passthruPromise) {
        return availableGames;
      }
      if ((typeof availableGames !== 'string')
        && (availableGames.choices.indexOf('tournament') > -1)) {
        speech += '_TOURNAMENT';
        return utils.getRemainingTournamentTime(handlerInput).then((text) => {
          attributes.temp.speechParams.Time = text;
          return availableGames;
        });
      } else {
        return availableGames;
      }
    }).then((availableGames) => {
      if (passthruPromise) {
        return availableGames;
      }
      if (typeof availableGames !== 'string') {
        attributes.choices = availableGames.choices;
        attributes.originalChoices = availableGames.choices;

        // Ask for the first one
        return handlerInput.jrm.render(ri('GAME_LIST_' + availableGames.choices[0].toUpperCase()))
        .then((game) => {
          attributes.temp.repromptParams.Game = game;
          Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);
          if (mentionButton(handlerInput)) {
            speech += '_BUTTON';
            attributes.temp.speechParams.Game1 = game;
            attributes.temp.speechParams.Game2 = game;
          }
          return handlerInput.jrb
            .speak(ri(speech, attributes.temp.speechParams))
            .reprompt(ri('LAUNCH_REPROMPT', attributes.temp.repromptParams))
            .getResponse();
        });
      }
      return response;
    });
  },
};

function mentionButton(handlerInput) {
  const attributes = handlerInput.attributesManager.getSessionAttributes();
  const now = Date.now();
  let retVal = false;

  if (buttons.supportButtons(handlerInput)) {
    if (!attributes.prompts.useButton ||
      ((now - attributes.prompts.useButton) > 4*24*60*60*1000)) {
      retVal = true;
      attributes.prompts.useButton = now;
    }
  }

  return retVal;
}

// Bucket a new user returning "A" or "B"
function getTestBucket(handlerInput) {
  const event = handlerInput.requestEnvelope;
  let i;
  let total = 0;
  const names = event.session.user.userId.split('.');
  const user = names[names.length - 1];

  for (i = 0; i < Math.max(10, user.length); i++) {
    total += user.charCodeAt(i);
  }
  return (total % 2 == 0) ? 'A' : 'B';
}
