//
// Handles stop, which will exit the skill
//

'use strict';

const ads = require('../ads');

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
        handlerInput.responseBuilder
          .speak(res.strings.EXIT_GAME.replace('{0}', adText))
          .withShouldEndSession(true);
        resolve();
      });
    });
  },
};
