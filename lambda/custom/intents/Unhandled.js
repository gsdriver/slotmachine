//
// Unhandled intents
//

'use strict';

module.exports = {
  canHandle: function(handlerInput) {
    return true;
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const res = require('../resources')(event.request.locale);

    handlerInput.responseBuilder
      .speak(res.strings.UNKNOWN_INTENT)
      .reprompt(res.strings.UNKNOWN_INTENT_REPROMPT);
  },
};
