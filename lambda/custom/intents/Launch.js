//
// Handles opening the skill
//

'use strict';

const utils = require('../utils');
const buttons = require('../buttons');
const ri = require('@jargon/alexa-skill-sdk').ri;

module.exports = {
  canHandle: function(handlerInput) {
    return handlerInput.requestEnvelope.session.new ||
      (handlerInput.requestEnvelope.request.type === 'LaunchRequest');
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    let response;
    let speech = 'LAUNCH';

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
    }).then(() => {
      if (attributes.temp.inSkillProductInfo) {
        if (!attributes.paid) {
          attributes.paid = {};
        }
        attributes.temp.inSkillProductInfo.inSkillProducts.forEach((product) => {
          attributes.paid[product.referenceName] = {
            productId: product.productId,
            state: (product.entitled == 'ENTITLED') ? 'PURCHASED' : 'AVAILABLE',
          };
        });
        attributes.temp.inSkillProductInfo = undefined;
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
      if (nextDay === 'nobust') {
        return 'continue';
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
      if (action === 'continue') {
        // Set up the buttons to all flash, welcoming the user to press a button
        attributes.buttonId = undefined;
        buttons.addLaunchAnimation(handlerInput);
        buttons.buildButtonDownAnimationDirective(handlerInput, []);
        buttons.startInputHandler(handlerInput, 20000);
        attributes.temp.deferReprompt = (buttons.supportButtons(handlerInput));

        // For a new user, just tell them to bet or say spin (which places a bet)
        if (attributes.newUser) {
          speech = (buttons.supportButtons(handlerInput))
            ? 'LAUNCH_NEWUSER_BUTTON'
            : 'LAUNCH_NEWUSER';
          response = handlerInput.jrb
            .speak(ri(speech, attributes.temp.speechParams))
            .reprompt(ri('LAUNCH_NEWUSER_REPROMPT'))
            .getResponse();
          return 'continue';
        } else if (attributes.temp.resumeGame) {
          speech = (buttons.supportButtons(handlerInput))
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
      if (typeof availableGames !== 'string') {
        attributes.choices = availableGames.choices;
        attributes.originalChoices = availableGames.choices;

        // Ask for the first one
        return handlerInput.jrm.render(ri('GAME_LIST_' + availableGames.choices[0].toUpperCase()))
        .then((game) => {
          attributes.temp.repromptParams.Game = game;
          Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);
          if (buttons.supportButtons(handlerInput)) {
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
