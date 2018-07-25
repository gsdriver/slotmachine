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

// build idle animation directive
const buildButtonIdleAnimationDirective = function(targetGadgets, animation) {
  return {
    'type': 'GadgetController.SetLight',
    'version': 1,
    'targetGadgets': targetGadgets,
    'parameters': {
      'animations': [{
        'repeat': 100,
        'targetLights': ['1'],
        'sequence': animation,
      }],
      'triggerEvent': 'none',
      'triggerEventTimeMs': 0,
    },
  };
};

const buildBreathAnimation = function(fromRgbHex, toRgbHex, steps, totalDuration) {
  const halfSteps = steps / 2;
  const halfTotalDuration = totalDuration / 2;
  return buildSeqentialAnimation(fromRgbHex, toRgbHex, halfSteps, halfTotalDuration)
    .concat(buildSeqentialAnimation(toRgbHex, fromRgbHex, halfSteps, halfTotalDuration));
};

const buildSeqentialAnimation = function(fromRgbHex, toRgbHex, steps, totalDuration) {
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
      'color': rgb2h(fromRed, fromGreen, fromBlue),
      'intensity': 255,
      'blend': true,
    });
    fromRed += deltaRed;
    fromGreen += deltaGreen;
    fromBlue += deltaBlue;
  }

  return result;
};

const rgb2h = function(r, g, b) {
  return '' + n2h(r) + n2h(g) + n2h(b);
};
// number to hex with leading zeroes
const n2h = function(n) {
  return ('00' + (Math.floor(n)).toString(16)).substr(-2);
};
