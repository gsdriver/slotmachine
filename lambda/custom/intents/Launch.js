//
// Handles opening the skill
//

'use strict';

const utils = require('../utils');
const buttons = require('../buttons');

module.exports = {
  canHandle: function(handlerInput) {
    return handlerInput.requestEnvelope.session.new ||
      (handlerInput.requestEnvelope.request.type === 'LaunchRequest');
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);

    // First off - are they out of money?
    if (attributes.busted) {
      if (Date.now() - attributes.busted > 24*60*60*1000) {
        handlerInput.responseBuilder
          .speak(res.strings.LAUNCH_BUSTED)
          .withEndSession(true);
      } else {
        attributes.bankroll += 25;
        attributes.busted = undefined;
      }
    }

    // Tell them the rules, their bankroll and offer a few things they can do
    const score = utils.getAchievementScore(attributes.achievements);
    let speech = '';

    // We support buttons
    // Build idle breathing animation that will play immediately
    // and button down animation for when the button is pressed
    utils.startButtonInput(handlerInput);
    const breathAnimation = buildBreathAnimation('000000', 'FFFFFF', 30, 1200);
    handlerInput.responseBuilder
      .addDirective(buildButtonIdleAnimationDirective([], breathAnimation))
      .addDirective(utils.buildButtonDownAnimationDirective([]));

    if (attributes.tournamentResult) {
      speech += attributes.tournamentResult;
      attributes.tournamentResult = undefined;
    }

    // For a new user, just tell them to bet or say spin (which places a bet)
    if (attributes.newUser) {
      handlerInput.responseBuilder
        .speak(res.strings.LAUNCH_NEWUSER)
        .reprompt(res.strings.LAUNCH_NEWUSER_REPROMPT);
    } else {
      if (score) {
        speech += res.strings.LAUNCH_WELCOME_ACHIEVEMENT.replace('{0}', score);
      } else {
        speech += res.strings.LAUNCH_WELCOME;
      }

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
    }
  },
};
