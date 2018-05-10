//
// Handles stop, which will exit the skill
//

'use strict';

const utils = require('../utils');

module.exports = {
  handleIntent: function() {
    const res = require('../' + this.event.request.locale + '/resources');
    let speech = '';
    let payout;
    const reprompt = (this.handler.state == 'SELECTGAME')
      ? res.strings.RULES_SELECT_REPROMPT
      : res.strings.RULES_REPROMPT;
    const rules = utils.getGame((this.handler.state == 'SELECTGAME')
      ? this.attributes.choices[0]
      : this.attributes.currentGame);

    // Wild symbols
    if (rules.special) {
      speech += res.strings[rules.special];
    }

    for (payout in rules.payouts) {
      if (payout && (rules.payouts[payout] >= 1)) {
        speech += utils.readPayout(this.event.request.locale, rules, payout);
        speech += utils.readPayoutAmount(this.event.request.locale, rules, payout);
        speech += ' <break time=\"200ms\"/>';
      }
    }

    speech += reprompt;

    this.attributes.temp.readingRules = true;
    utils.emitResponse(this, null, null,
          speech, reprompt,
          res.strings.RULES_CARD_TITLE, utils.readPayoutTable(this.event.request.locale, rules));
  },
};
