//
// Handles the odd case that we get an input event that
// isn't from the most recently issued input event
//

'use strict';

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return ((request.type === 'GameEngine.InputHandlerEvent')
      && (request.originatingRequestId !== attributes.temp.inputHandlerRequestId));
  },
  handle: function(handlerInput) {
    // This is a timeout that we received from an input event
    // that wasn't the most recent one - we should just ignore it
    console.log('Received old button input!');
    return Promise.resolve();
  },
};
