//
// Saves attributes at the end of the session
//

'use strict';

const buttons = require('../buttons');
const upsell = require('../UpsellEngine');

module.exports = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // If we get a session end timeout, we'll process it
    if (request.type === 'GameEngine.InputHandlerEvent') {
      const timeout = buttons.timedOut(handlerInput);
      return ((timeout === 'sessionend') && !attributes.temp.ignoreTimeouts);
    }

    return (request.type === 'SessionEndedRequest');
  },
  handle: function(handlerInput) {
    console.log('End session - saving attributes');
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // Clear and persist attributes
    return upsell.saveSession(handlerInput)
    .then(() => {
      attributes.temp = undefined;
      handlerInput.attributesManager.setPersistentAttributes(attributes);
      handlerInput.attributesManager.savePersistentAttributes();
    });
  },
};
