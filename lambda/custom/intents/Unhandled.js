//
// Unhandled intents
//

'use strict';

const utils = require('../utils');

module.exports = {
  canHandle: function(handlerInput) {
    return true;
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const res = require('../resources')(event.request.locale);

    // Fail silently if this was an unhandled button event
    if (event.request.type !== 'GameEngine.InputHandlerEvent') {
      const speech = res.strings.UNKNOWN_INTENT;
      const reprompt = res.strings.UNKNOWN_INTENT_REPROMPT;
      return handlerInput.responseBuilder
        .speak(utils.ri(speech, attributes.temp.speechParams))
        .reprompt(utils.ri(reprompt, attributes.temp.repromptParams))
        .getResponse();
    }
  },
};
