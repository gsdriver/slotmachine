//
// Echo Button support functions
//

'use strict';

module.exports = {
  supportButtons: function(handlerInput) {
    const localeList = ['en-US', 'en-GB', 'de-DE'];
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const locale = handlerInput.requestEnvelope.request.locale;

    return (!process.env.NOBUTTONS &&
      (localeList.indexOf(locale) >= 0) &&
      (attributes.platform !== 'google') && !attributes.bot);
  },
  getPressedButton: function(request, attributes) {
    const gameEngineEvents = request.events || [];
    let buttonId;

    gameEngineEvents.forEach((engineEvent) => {
      // in this request type, we'll see one or more incoming events
      // corresponding to the StartInputHandler we sent above
      if (engineEvent.name === 'button_down_event') {
        // save id of the button that triggered event
        console.log('Received button down request');
        attributes.usedButton = true;
        buttonId = engineEvent.inputEvents[0].gadgetId;
      }
    });

    return buttonId;
  },
  timedOut: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const gameEngineEvents = request.events || [];
    let timedOut;

    gameEngineEvents.forEach((engineEvent) => {
      // in this request type, we'll see one or more incoming events
      // corresponding to the StartInputHandler we sent above
      if (engineEvent.name === 'timeout_event') {
        timedOut = true;
      }
    });

    return timedOut;
  },
  stopInputHandler: function(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    if (attributes.temp.inputHandlerRequestId) {
      handlerInput.responseBuilder.addDirective({
        'type': 'GameEngine.StopInputHandler',
        'originatingRequestId': attributes.temp.inputHandlerRequestId,
      });
    }
  },
  startInputHandler: function(handlerInput, forceTimeout) {
    if (module.exports.supportButtons(handlerInput)) {
      // We'll allow them to press the button again
      const request = handlerInput.requestEnvelope.request;
      const attributes = handlerInput.attributesManager.getSessionAttributes();
      const directive = {
        'type': 'GameEngine.StartInputHandler',
        'timeout': (forceTimeout) ? forceTimeout : 20000,
        'recognizers': {
          'button_down_recognizer': {
            'type': 'match',
            'fuzzy': false,
            'anchor': 'start',
            'pattern': [{
              'action': 'down',
            }],
          },
        },
        'events': {
          'button_down_event': {
            'meets': ['button_down_recognizer'],
            'reports': 'matches',
            'shouldEndInputHandler': true,
            'maximumInvocations': 1,
          },
        },
      };

      if (attributes.buttonId) {
        directive.recognizers.button_down_recognizer.gadgetIds = [attributes.buttonId];
      }

      if (attributes.buttonId || forceTimeout) {
        directive.events['timeout_event'] = {
          'meets': ['timed out'],
          'reports': 'history',
          'shouldEndInputHandler': true,
        };
      }
      attributes.temp.inputHandlerRequestId = request.requestId;
      handlerInput.jrb.addDirective(directive);
    }
  },
  buildButtonDownAnimationDirective: function(handlerInput, targetGadgets) {
    if (module.exports.supportButtons(handlerInput)) {
      const buttonDownDirective = {
        'type': 'GadgetController.SetLight',
        'version': 1,
        'targetGadgets': targetGadgets,
        'parameters': {
          'animations': [{
            'repeat': 1,
            'targetLights': ['1'],
            'sequence': [{
              'durationMs': 500,
              'color': 'FFFF00',
              'intensity': 255,
              'blend': false,
            }],
          }],
          'triggerEvent': 'buttonDown',
          'triggerEventTimeMs': 0,
        },
      };
      handlerInput.jrb.addDirective(buttonDownDirective);
    }
  },
  colorDuringSpin: function(handlerInput, buttonId) {
    if (module.exports.supportButtons(handlerInput)) {
      const buttonIdleDirective = {
        'type': 'GadgetController.SetLight',
        'version': 1,
        'targetGadgets': [buttonId],
        'parameters': {
          'animations': [{
            'repeat': 30,
            'targetLights': ['1'],
            'sequence': [{
              'durationMs': 400,
              'color': 'FFFFFF',
              'blend': true,
            },
            {
              'durationMs': 400,
              'color': '000000',
              'blend': true,
            }],
          }],
          'triggerEvent': 'none',
          'triggerEventTimeMs': 0,
        },
      };

      handlerInput.jrb.addDirective(buttonIdleDirective);
    }
  },
  colorSpinResult: function(handlerInput, buttonId, buttonColor) {
    if (module.exports.supportButtons(handlerInput)) {
      let i;
      const buttonIdleDirective = {
        'type': 'GadgetController.SetLight',
        'version': 1,
        'targetGadgets': [buttonId],
        'parameters': {
          'animations': [{
            'repeat': 1,
            'targetLights': ['1'],
            'sequence': [],
          }],
          'triggerEvent': 'none',
          'triggerEventTimeMs': 0,
        },
      };

      // Pulse based on whether they won or lost
      for (i = 0; i < 4; i++) {
        buttonIdleDirective.parameters.animations[0].sequence.push({
          'durationMs': 400,
          'color': buttonColor,
          'blend': true,
        });
        buttonIdleDirective.parameters.animations[0].sequence.push({
          'durationMs': 300,
          'color': '000000',
          'blend': true,
        });
      }

      // And then back to white
      buttonIdleDirective.parameters.animations[0].sequence.push({
        'durationMs': 60000,
        'color': 'FFFFFF',
        'blend': false,
      });
      handlerInput.jrb.addDirective(buttonIdleDirective);
    }
  },
  addLaunchAnimation: function(handlerInput) {
    if (module.exports.supportButtons(handlerInput)) {
      // Flash the buttons white a few times
      // Then place them all in a steady white state
      const buttonIdleDirective = {
        'type': 'GadgetController.SetLight',
        'version': 1,
        'targetGadgets': [],
        'parameters': {
          'animations': [{
            'repeat': 1,
            'targetLights': ['1'],
            'sequence': [],
          }],
          'triggerEvent': 'none',
          'triggerEventTimeMs': 0,
        },
      };

      // Add to the animations array
      let i;
      for (i = 0; i < 4; i++) {
        buttonIdleDirective.parameters.animations[0].sequence.push({
          'durationMs': 400,
          'color': 'FFFFFF',
          'blend': true,
        });
        buttonIdleDirective.parameters.animations[0].sequence.push({
          'durationMs': 300,
          'color': '000000',
          'blend': true,
        });
      }
      buttonIdleDirective.parameters.animations[0].sequence.push({
        'durationMs': 60000,
        'color': 'FFFFFF',
        'blend': false,
      });
      handlerInput.jrb.addDirective(buttonIdleDirective);
    }
  },
};
