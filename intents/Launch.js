//
// Handles opening the skill
//

'use strict';

const utils = require('../utils');

module.exports = {
  handleIntent: function() {
    // Tell them the rules, their bankroll and offer a few things they can do
    const res = require('../' + this.event.request.locale + '/resources');
    const score = utils.getAchievementScore(this.attributes.achievements);
    let speech = '';

    if (this.attributes.tournamentResult) {
      speech += this.attributes.tournamentResult;
      this.attributes.tournamentResult = undefined;
    }

    // For a new user, just tell them to bet or say spin (which places a bet)
    if (this.attributes.newUser) {
      this.handler.state = 'INGAME';
      utils.emitResponse(this, null, null,
          res.strings.LAUNCH_NEWUSER, res.strings.LAUNCH_NEWUSER_REPROMPT);
    } else {
      if (score) {
        speech += res.strings.LAUNCH_WELCOME_ACHIEVEMENT.replace('{0}', score);
      } else {
        speech += res.strings.LAUNCH_WELCOME;
      }

      // Read the available games then prompt for each one
      utils.readAvailableGames(this, true, (gameText, choices) => {
        if (choices.indexOf('tournament') > -1) {
          speech = res.strings.LAUNCH_WELCOME_TOURNAMENT.replace('{0}', utils.getRemainingTournamentTime(this));
        } else {
          speech += gameText;
        }
        this.attributes.choices = choices;
        this.attributes.originalChoices = choices;
        this.handler.state = 'SELECTGAME';

        // Ask for the first one
        const reprompt = res.strings.LAUNCH_REPROMPT.replace('{0}', res.sayGame(choices[0]));
        speech += reprompt;
        utils.emitResponse(this, null, null, speech, reprompt);
      });
    }
  },
};
