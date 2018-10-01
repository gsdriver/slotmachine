//
// Handles stop, which will exit the skill
//

'use strict';

const utils = require('../utils');

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
    const speech = res.strings.ERROR_REPROMPT;
    const reprompt = res.strings.ERROR_REPROMPT;
    return handlerInput.responseBuilder
      .speak(utils.ri(speech, attributes.temp.speechParams))
      .reprompt(utils.ri(reprompt, attributes.temp.repromptParams))
      .getResponse();
  },
};
