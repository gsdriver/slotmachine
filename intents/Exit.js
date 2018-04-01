//
// Handles stop, which will exit the skill
//

'use strict';

const utils = require('../utils');
const ads = require('../ads');

module.exports = {
  handleIntent: function() {
    const res = require('../' + this.event.request.locale + '/resources');

    ads.getAd(this.attributes, 'slots', this.event.request.locale, (adText) => {
      utils.emitResponse(this, null, res.strings.EXIT_GAME.replace('{0}', adText), null, null);
    });
  },
};
