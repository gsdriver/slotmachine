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
    const reprompt = res.strings.HELP_REPROMPT;

    speech = res.strings.READ_BANKROLL.replace('{0}', utils.readCoins(this.event.request.locale, game.bankroll));
    speech += reprompt;
    speech += res.strings.HELP_COMMANDS;

    this.emit(':askWithCard', speech, reprompt, res.strings.HELP_CARD_TITLE, utils.readPayoutTable(this.event.request.locale, rules));
  },
};
