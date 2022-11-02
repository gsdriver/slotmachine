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
    let inSkillProductInfo;

    try {
      const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
      inSkillProductInfo = await ms.getInSkillProducts(event.request.locale);
    } catch(e) {
      // Ignore errors
    }

    console.log('isp', inSkillProductInfo);
    if (inSkillProductInfo) {
      let state;
      attributes.paid = {};
      inSkillProductInfo.inSkillProducts.forEach((product) => {
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
    }

    // OK - now that we got the ISP information - if they are a new user, let's bucket them
    if (attributes.newUser) {
      // We are going to go right into a spin
      attributes.temp.forceWin = true;
      return Spin.handle(handlerInput);
    }

    attributes.temp.speechParams.Greeting = await utils.getGreeting(handlerInput);

    // Check to see if we should upsell
    // Don't upsell if the tournament is available or there is a result
    if (!attributes.temp.resumeGame
      && !attributes.temp.tournamentAvailable
      && !(attributes.tournamentResult && (attributes.tournamentResult.length > 0))) {
      const directive = await upsell.evaluateTrigger(handlerInput.requestEnvelope.session.user.userId, 'launch');
      if (directive) {
        directive.token = 'machine.' + directive.token + '.launch';
        return handlerInput.responseBuilder
          .addDirective(directive)
          .withShouldEndSession(true)
          .getResponse();
      }
    }

    // OK - are they out of money?
    attributes.temp.speechParams.TournamentResult = attributes.tournamentResult;
    if (attributes.busted) {
      if (attributes.paid && attributes.paid.coinreset && (attributes.paid.coinreset.state == 'PURCHASED')) {
        speech += '_BUSTED_SUBSCRIBED';
        attributes.temp.speechParams.Coins = utils.STARTING_BANKROLL;
        attributes.bankroll += utils.STARTING_BANKROLL;
        attributes.busted = undefined;
      } else if (attributes.temp.tournamentAvailable) {
        // If the tournament is available, we'll throw 5 coins at you to play
        speech += '_BUSTED';
        attributes.bankroll += 5;
        attributes.busted = undefined;
      } else {
        // Is it the next day or not?
        const nextDay = await utils.isNextDay(handlerInput);
        if (!nextDay) {
          // Here's the place to do an upsell if we can!
          const coinresetDirective = await upsell.evaluateTrigger(handlerInput.requestEnvelope.session.user.userId, 'bankrupt');
          if (coinresetDirective) {
            // Prepend the Tournament result and return this directive
            if (attributes.tournamentResult) {
              coinresetDirective.payload.upsellMessage = `${attributes.tournamentResult} ${coinresetDirective.payload.upsellMessage}`;
            }
            coinresetDirective.token = `subscribe.${coinresetDirective.token}.launch`;
            return handlerInput.responseBuilder
              .addDirective(coinresetDirective)
              .withShouldEndSession(true)
              .getResponse();
          } else {
            speech += '_BUSTED';
            attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
            return handlerInput.jrb
              .speak(ri(speech, attributes.temp.speechParams))
              .withShouldEndSession(true)
              .getResponse();
          }
        } else {
          // OK, we can replenish their bankroll
          speech += '_BUSTED_REPLENISH';
          attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
          attributes.bankroll += utils.REFRESH_BANKROLL;
          attributes.busted = undefined;
        }
      }
    }

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
      return handlerInput.jrb
        .speak(ri(speech, attributes.temp.speechParams))
        .reprompt(ri('LAUNCH_NEWUSER_REPROMPT'))
        .getResponse();
    } else if (attributes.temp.resumeGame) {
      speech = (mentionButton(handlerInput))
        ? 'LAUNCH_RESUME_GAME_BUTTON'
        : 'LAUNCH_RESUME_GAME';
      attributes.temp.resumeGame = undefined;
      return handlerInput.jrb
        .speak(ri(speech, attributes.temp.speechParams))
        .reprompt(ri('LAUNCH_RESUME_GAME_REPROMPT'))
        .getResponse();
    }

    // Read the available games then prompt for each one
    const availableGames = await utils.readAvailableGames(handlerInput, true);
    if (availableGames.choices.indexOf('tournament') > -1) {
      speech += '_TOURNAMENT';
      attributes.temp.speechParams.Time = await utils.getRemainingTournamentTime(handlerInput);
    }

    attributes.choices = availableGames.choices;
    attributes.originalChoices = availableGames.choices;

    // Ask for the first one
    const game = await handlerInput.jrm.render(ri('GAME_LIST_' + availableGames.choices[0].toUpperCase()));
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
