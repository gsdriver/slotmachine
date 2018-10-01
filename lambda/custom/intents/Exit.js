//
// Handles stop, which will exit the skill
//

'use strict';

const ads = require('../ads');
const utils = require('../utils');

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
    const res = require('../resources')(event.request.locale);

    return new Promise((resolve, reject) => {
      ads.getAd(attributes, 'slots', event.request.locale, (adText) => {
        const speech = res.strings.EXIT_GAME;
        attributes.temp.speechParams.Ad = adText;
        const response = handlerInput.responseBuilder
          .speak(utils.ri(speech, attributes.temp.speechParams))
          .withShouldEndSession(true)
          .getResponse();
        resolve(response);
      });
    });
  },
};
