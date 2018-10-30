//
// If the button times out, says the appropriate reprompt
//

'use strict';

const buttons = require('../buttons');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // We handle timeouts from spin and reprompt
    // We don't handle a close session timeout (let that close the session)
    if (request.type === 'GameEngine.InputHandlerEvent') {
      const timeout = buttons.timedOut(handlerInput);
      return ((timeout === 'spin')
        || ((timeout === 'reprompt') && attributes.temp && !attributes.temp.ignoreTimeouts));
    }

    return false;
  },
  handle: function(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const timeout = buttons.timedOut(handlerInput);

    // If they were spinning, it means we should flash to the new color
    // and display the results of the spin, but no output speech
    if (timeout === 'spin') {
      buttons.setRepromptHandler(handlerInput, 10000);
      buttons.colorSpinResult(handlerInput, attributes.buttonId, attributes.temp.spinColor);
      attributes.temp.spinColor = undefined;
      return handlerInput.responseBuilder
        .withShouldEndSession(undefined)
        .getResponse();
    }

    // If there was a timeout, then reprompt
    // Note that this string has already been rendered so don't use Jargon
    buttons.setSessionEndHandler(handlerInput, 10000);
    return handlerInput.responseBuilder
      .speak(attributes.temp.lastReprompt)
      .withShouldEndSession(false)
      .getResponse();
  },
};
