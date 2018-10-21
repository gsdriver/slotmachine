//
// Handles the odd case that we get an input event timeout that
// isn't from the most recently issued input event
//

'use strict';

const buttons = require('../buttons');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return ((request.type === 'GameEngine.InputHandlerEvent')
      && buttons.timedOut(handlerInput)
      && (request.originatingRequestId !== attributes.temp.inputHandlerRequestId));
  },
  handle: function(handlerInput) {
    // This is a timeout that we received from an input event
    // that wasn't the most recent one - we should just ignore it
    console.log('Received old time out!');
    return Promise.resolve();
  },
};
