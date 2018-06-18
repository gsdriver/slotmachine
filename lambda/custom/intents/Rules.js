//
// Handles stop, which will exit the skill
//

'use strict';

const utils = require('../utils');

module.exports = {
  handleIntent: function() {
    let speech = '';
    let payout;
    const reprompt = (this.handler.state == 'SELECTGAME')
      ? this.t('RULES_SELECT_REPROMPT')
      : this.t('RULES_REPROMPT');
    const rules = utils.getGame((this.handler.state == 'SELECTGAME')
      ? this.attributes.choices[0]
      : this.attributes.currentGame);

    // Wild symbols
    if (rules.special) {
      speech += this.t(rules.special);
    }

    for (payout in rules.payouts) {
      if (payout && (rules.payouts[payout] >= 1)) {
        speech += utils.readPayout(this, rules, payout);
        speech += utils.readPayoutAmount(this, rules, payout);
        speech += ' <break time=\"200ms\"/>';
      }
    }

    speech += reprompt;

    this.attributes.temp.readingRules = true;
    utils.emitResponse(this, null, null,
          speech, reprompt,
          this.t('RULES_CARD_TITLE'), utils.readPayoutTable(this, rules));
  },
};
