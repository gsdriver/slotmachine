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
    const buttonId = buttons.getPressedButton(event.request, attributes);

    // We'll allow them to press this button again and disable the others
    if (buttonId) {
      attributes.usedButton = true;
      buttons.disableButtons(handlerInput);
      buttons.startInputHandler(handlerInput);

      // If they pressed a different button than the one they did before, ignore it
      if (!attributes.temp.buttonId || (buttonId == attributes.temp.buttonId)) {
        attributes.temp.buttonId = buttonId;
        Spin.handle(handlerInput);
      }
    }
  },
};
