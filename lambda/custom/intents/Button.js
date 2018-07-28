//
// Handles an Echo button being pressed
//

'use strict';

const Spin = require('./Spin');
const buttons = require('../buttons');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return (request.type === 'GameEngine.InputHandlerEvent');
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    if (buttons.getPressedButton(event.request, attributes)) {
      // We'll allow them to press this button again and disable the others
      buttons.disableButtons(handlerInput);
      buttons.startButtonInput(handlerInput);
      Spin.handle(handlerInput);
    }
  },
};
