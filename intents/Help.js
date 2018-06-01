//
// Handles stop, which will exit the skill
//

'use strict';

const utils = require('../utils');

module.exports = {
  handleIntent: function() {
    const game = this.attributes[this.attributes.currentGame];
    const rules = utils.getGame(this.attributes.currentGame);
    let speech;

    this.attributes.temp.readingRules = false;
    if (this.handler.state == 'SELECTGAME') {
      // If selecting a game, help string is different
      const reprompt = this.t('LAUNCH_REPROMPT').replace('{0}', utils.sayGame(this, this.attributes.choices[0]));

      speech = this.t('HELP_SELECT_TEXT');
      speech += reprompt;
      utils.emitResponse(this, null, null, speech, reprompt);
    } else {
      const reprompt = this.t('HELP_REPROMPT');

      if (this.attributes.currentGame == 'tournament') {
        // Give some details about the tournament
        speech = this.t('HELP_TOURNAMENT').replace('{0}', utils.getRemainingTournamentTime(this));
        speech += this.t('READ_BANKROLL').replace('{0}', utils.readCoins(this, game.bankroll));
        speech += this.t('HELP_COMMANDS');
      } else {
        speech = this.t('READ_BANKROLL').replace('{0}', utils.readCoins(this, game.bankroll));
        speech += this.t('HELP_COMMANDS');
        speech = this.t('HELP_ACHIEVEMENT_POINTS') + speech;
      }
      speech += reprompt;

      utils.emitResponse(this, null, null,
            speech, reprompt,
            this.t('HELP_CARD_TITLE'),
            this.t('HELP_ACHIEVEMENT_CARD_TEXT')
            + utils.readPayoutTable(this, rules));
    }
  },
};
