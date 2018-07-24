//
// Handles opening the skill
//

'use strict';

const utils = require('../utils');

module.exports = {
  handleIntent: function() {
    // Tell them the rules, their bankroll and offer a few things they can do
    const score = utils.getAchievementScore(this.attributes.achievements);
    let speech = '';

    // We support buttons
    // Build idle breathing animation that will play immediately
    // and button down animation for when the button is pressed
    utils.startButtonInput(this);
    const breathAnimation = buildBreathAnimation('000000', 'FFFFFF', 30, 1200);
    this.response._addDirective(buildButtonIdleAnimationDirective([], breathAnimation));
    this.response._addDirective(utils.buildButtonDownAnimationDirective([]));

    if (this.attributes.tournamentResult) {
      speech += this.attributes.tournamentResult;
      this.attributes.tournamentResult = undefined;
    }

    // For a new user, just tell them to bet or say spin (which places a bet)
    if (this.attributes.newUser) {
      this.handler.state = 'INGAME';
      utils.emitResponse(this, null, null,
          this.t('LAUNCH_NEWUSER'), this.t('LAUNCH_NEWUSER_REPROMPT'));
    } else {
      if (score) {
        speech += this.t('LAUNCH_WELCOME_ACHIEVEMENT').replace('{0}', score);
      } else {
        speech += this.t('LAUNCH_WELCOME');
      }

      // Read the available games then prompt for each one
      utils.readAvailableGames(this, true, (gameText, choices) => {
        if (choices.indexOf('tournament') > -1) {
          speech = this.t('LAUNCH_WELCOME_TOURNAMENT').replace('{0}', utils.getRemainingTournamentTime(this));
        } else {
          speech += gameText;
        }
        this.attributes.choices = choices;
        this.attributes.originalChoices = choices;
        this.handler.state = 'SELECTGAME';

        // Ask for the first one
        const reprompt = this.t('LAUNCH_REPROMPT').replace('{0}', utils.sayGame(this, choices[0]));
        speech += reprompt;
        utils.emitResponse(this, null, null, speech, reprompt);
      });
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
