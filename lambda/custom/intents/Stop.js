//
// Handles stop, which will exit the skill
//

'use strict';

module.exports = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // Can always handle with Stop and Cancel
    return ((request.type === 'IntentRequest') &&
      (request.intent.name === 'AMAZON.StopIntent') &&
      attributes.temp.readingRules);
  },
  handle: function(handlerInput) {
    // Stop reading the rules
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);

    attributes.temp.readingRules = false;
    handlerInput.responseBuilder
      .speak(res.strings.ERROR_REPROMPT)
      .reprompt(res.strings.ERROR_REPROMPT);
  },
};
