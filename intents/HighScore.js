//
// Reads the top high scores
//

'use strict';

const utils = require('../utils');

module.exports = {
  handleIntent: function() {
    const res = require('../' + this.event.request.locale + '/resources');

    utils.readLeaderBoard(this.event.request.locale,
      this.event.session.user.userId, this.attributes, (highScores) => {
      const speech = highScores + '. ' + res.strings.HIGHSCORE_REPROMPT;
      utils.emitResponse(this.emit, this.event.request.locale, null,
          null, speech, res.strings.HIGHSCORE_REPROMPT);
    });
  },
};
