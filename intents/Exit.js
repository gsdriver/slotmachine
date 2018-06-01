//
// Handles stop, which will exit the skill
//

'use strict';

const utils = require('../utils');
const ads = require('../ads');

module.exports = {
  handleIntent: function() {
    ads.getAd(this.attributes, 'slots', this.event.request.locale, (adText) => {
      utils.emitResponse(this, null, this.t('EXIT_GAME').replace('{0}', adText), null, null);
    });
  },
};
