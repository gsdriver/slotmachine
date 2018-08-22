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

    // Fail silently if this was an unhandled button event
    if (event.request.type !== 'GameEngine.InputHandlerEvent') {
      return handlerInput.responseBuilder
        .speak(res.strings.UNKNOWN_INTENT)
        .reprompt(res.strings.UNKNOWN_INTENT_REPROMPT)
        .getResponse();
    }
  },
};
