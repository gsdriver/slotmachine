//
// Handles stop, which will exit the skill
//

'use strict';

const ri = require('@jargon/alexa-skill-sdk').ri;

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
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    attributes.temp.readingRules = false;
    return handlerInput.jrb
      .speak(ri('ERROR_REPROMPT'))
      .reprompt(ri('ERROR_REPROMPT'))
      .getResponse();
  },
};
