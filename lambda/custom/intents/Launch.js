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
    let speech = '';

    if (attributes.tournamentResult) {
      speech += attributes.tournamentResult;
      attributes.tournamentResult = undefined;
    }

    // First off - are they out of money?
    if (attributes.busted) {
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
        speech += res.strings.LAUNCH_BUSTED.replace('{0}', utils.REFRESH_BANKROLL);
        handlerInput.responseBuilder
          .speak(speech)
          .withShouldEndSession(true);
        return;
      } else {
        speech += res.strings.LAUNCH_BUSTED_REPLENISH.replace('{0}', utils.REFRESH_BANKROLL);
        attributes.bankroll += 25;
        attributes.busted = undefined;
      }
    }

    // We support buttons
    // Build idle breathing animation that will play immediately
    // and button down animation for when the button is pressed
    utils.startButtonInput(handlerInput);
    const breathAnimation = buildBreathAnimation('000000', 'FFFFFF', 30, 1200);
    handlerInput.responseBuilder
      .addDirective(buildButtonIdleAnimationDirective([], breathAnimation))
      .addDirective(utils.buildButtonDownAnimationDirective([]));

    // For a new user, just tell them to bet or say spin (which places a bet)
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
    }
  },
};
