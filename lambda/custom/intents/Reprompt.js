//
// If the button times out, says the appropriate reprompt
//

'use strict';

const buttons = require('../buttons');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // If deferReprompt is false, it means that we had deferred a
    // reprompt last time, so we should handle it now
    return ((request.type === 'GameEngine.InputHandlerEvent') &&
      (attributes.temp.deferReprompt === false) && buttons.timedOut(handlerInput));
  },
  handle: function(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // If they were spinning, it means we should flash to the new color
    // no output speech otherwise, but reset deferReprompt so we will
    // handle the timeout event when it happens again
    if (attributes.temp.spinColor) {
      buttons.startInputHandler(handlerInput, 10000);
      buttons.colorSpinResult(handlerInput, attributes.buttonId, attributes.temp.spinColor);
      attributes.temp.spinColor = undefined;
      attributes.temp.deferReprompt = true;
      return handlerInput.responseBuilder.getResponse();
    }

    // If there was a timeout, then reprompt
    // Note that this string has already been rendered so don't use Jargon
    buttons.startInputHandler(handlerInput, 10000);
    return handlerInput.responseBuilder
      .speak(attributes.temp.lastReprompt)
      .withShouldEndSession(false)
      .getResponse();
  },
};
