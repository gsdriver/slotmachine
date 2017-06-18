//
// Handles stop, which will exit the skill
//

'use strict';

const utils = require('../utils');

module.exports = {
  handleIntent: function() {
    const res = require('../' + this.event.request.locale + '/resources');
    const rules = utils.getGame(this.attributes.currentGame);
    let speech = '';
    const reprompt = res.strings.RULES_REPROMPT;
    let payout;

    // Wild symbols
    speech += utils.readWildSymbols(this.event.request.locale, rules);
    for (payout in rules.payouts) {
      if (payout) {
        speech += utils.readPayout(this.event.request.locale, rules, payout);
        speech += res.strings.PAYOUT_PAYS.replace('{0}', rules.payouts[payout]);
        speech += ' <break time=\"200ms\"/>';
      }
    }

    speech += reprompt;

    this.emit(':askWithCard', speech, reprompt, res.strings.RULES_CARD_TITLE, utils.readPayoutTable(this.event.request.locale, rules));
  },
};
