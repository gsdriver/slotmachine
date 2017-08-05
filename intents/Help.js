//
// Handles stop, which will exit the skill
//

'use strict';

const utils = require('../utils');

module.exports = {
  handleIntent: function() {
    const res = require('../' + this.event.request.locale + '/resources');
    const game = this.attributes[this.attributes.currentGame];
    const rules = utils.getGame(this.attributes.currentGame);
    let speech;

    if (this.handler.state == 'SELECTGAME') {
      // If selecting a game, help string is different
      const reprompt = res.strings.LAUNCH_REPROMPT.replace('{0}', res.sayGame(this.attributes.choices[0]));

      speech = res.strings.HELP_SELECT_TEXT;
      speech += reprompt;
      utils.emitResponse(this.emit, this.event.request.locale, null, null, speech, reprompt);
    } else {
      const reprompt = res.strings.HELP_REPROMPT;

      speech = res.strings.READ_BANKROLL.replace('{0}', utils.readCoins(this.event.request.locale, game.bankroll));
      speech += res.strings.HELP_COMMANDS;
      speech += reprompt;

      utils.emitResponse(this.emit, this.event.request.locale, null, null,
            speech, reprompt,
            res.strings.HELP_CARD_TITLE, utils.readPayoutTable(this.event.request.locale, rules));
    }
  },
};
