//
// Utility functions
//

'use strict';

module.exports = {
  emitResponse: function(emit, locale, error, response, speech, reprompt) {
    if (error) {
      const res = require('./' + locale + '/resources');
      console.log('Speech error: ' + error);
      emit(':ask', error, res.ERROR_REPROMPT);
    } else if (response) {
      emit(':tell', response);
    } else {
      emit(':ask', speech, reprompt);
    }
  },
};
