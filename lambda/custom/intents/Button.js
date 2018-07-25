//
// Handles an Echo button being pressed
//

'use strict';

const utils = require('../utils');
const Spin = require('./Spin');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return ((request.type === 'IntentRequest') && (request.intent.name === 'GameEngine.InputHandlerEvent'));
  },
  handle: function(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const gameEngineEvents = this.event.request.events || [];

    gameEngineEvents.forEach((engineEvent) => {
      // in this request type, we'll see one or more incoming events
      // corresponding to the StartInputHandler we sent above
      if (engineEvent.name === 'timeout') {
        console.log('Timed out waiting for button');
      } else if (engineEvent.name === 'button_down_event') {
        // id of the button that triggered event
        // we only support one button so save it here
        console.log('Received button down request');
        attributes.usedButton = true;
        attributes.temp.buttonId = engineEvent.inputEvents[0].gadgetId;

        // We'll allow them to press the button again
        utils.startButtonInput(handlerInput);
        Spin.handle(handlerInput);
      }
    });
  },
};
