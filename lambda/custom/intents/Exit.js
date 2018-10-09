//
// Handles stop, which will exit the skill
//

'use strict';

const ads = require('../ads');
const ri = require('@jargon/alexa-skill-sdk').ri;

module.exports = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // Can always handle with Stop and Cancel
    if (request.type === 'IntentRequest') {
      if (request.intent.name === 'AMAZON.CancelIntent') {
        return true;
      }
      if (request.intent.name === 'AMAZON.NoIntent') {
        return (!attributes.choices || !attributes.choices.length);
      }
      if (request.intent.name === 'AMAZON.StopIntent') {
        return (!attributes.temp.readingRules);
      }
    }

    return false;
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return ads.getAd(attributes, 'slots', event.request.locale)
    .then((adText) => {
      attributes.temp.speechParams.Ad = adText;
      return handlerInput.jrb
        .speak(ri('EXIT_GAME', attributes.temp.speechParams))
        .withShouldEndSession(true)
        .getResponse();
    });
  },
};
