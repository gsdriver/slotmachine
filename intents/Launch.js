//
// Handles opening the skill
//

'use strict';

const utils = require('../utils');
const speechUtils = require('alexa-speech-utils')();

module.exports = {
  handleIntent: function() {
    // Tell them the rules, their bankroll and offer a few things they can do
    const res = require('../' + this.event.request.locale + '/resources');
    const reprompt = res.strings.LAUNCH_REPROMPT;
    let speech = res.strings.LAUNCH_WELCOME;
    const game = this.attributes[this.attributes.currentGame];

    speech += res.strings.READ_BANKROLL.replace('{0}', speechUtils.numberOfItems(game.bankroll, res.strings.SINGLE_COIN, res.strings.PLURAL_COIN));
    speech += reprompt;
    utils.emitResponse(this.emit, this.event.request.locale, null, null, speech, reprompt);
  },
};
