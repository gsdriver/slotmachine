//
// Handles stop, which will exit the skill
//

'use strict';

const utils = require('../utils');
const ads = require('../ads');

module.exports = {
  handleIntent: function() {
    const res = require('../' + this.event.request.locale + '/resources');
    const tournamentTime = utils.timeUntilTournament();
    let speech;

    if (tournamentTime && (tournamentTime.days || tournamentTime.hours)) {
      if (tournamentTime.days == 0) {
        // It's later today
        speech = res.strings.EXIT_TOURNAMENT_TODAY;
      } else if (tournamentTime.days < 2) {
        // Tease it!
        speech = res.strings.EXIT_TOURNAMENT_SOON;
      }
    }

    if (speech) {
      utils.emitResponse(this, null, speech, null, null);
    } else {
      ads.getAd(this.attributes, 'slots', this.event.request.locale, (adText) => {
        utils.emitResponse(this, null, res.strings.EXIT_GAME.replace('{0}', adText), null, null);
      });
    }
  },
};
