//
// Handles opening the skill
//

'use strict';

const utils = require('../utils');
const buttons = require('../buttons');

module.exports = {
  handleIntent: function() {
    // Tell them the rules, their bankroll and offer a few things they can do
    const score = utils.getAchievementScore(this.attributes.achievements);
    let speech = '';

    // Set up the buttons to all flash, welcoming the user to press a button
    buttons.addLaunchAnimation(this);
    buttons.buildButtonDownAnimationDirective(this, []);
    buttons.startInputHandler(this);

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
