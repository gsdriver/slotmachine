//
// Echo Button support functions
//

'use strict';

module.exports = {
  getPressedButton: function(request, attributes) {
    const gameEngineEvents = request.events || [];
    let buttonId;

    gameEngineEvents.forEach((engineEvent) => {
      // in this request type, we'll see one or more incoming events
      // corresponding to the StartInputHandler we sent above
      if (engineEvent.name === 'timeout') {
        console.log('Timed out waiting for button');
      } else if (engineEvent.name === 'button_down_event') {
        // save id of the button that triggered event
        console.log('Received button down request');
        buttonId = engineEvent.inputEvents[0].gadgetId;
      }
    });

    return buttonId;
  },
  startInputHandler: function(context) {
    // We'll allow them to press the button again
    context.response._addDirective({
      'type': 'GameEngine.StartInputHandler',
      'timeout': 60000,
      'recognizers': {
        'button_down_recognizer': {
          'type': 'match',
          'fuzzy': false,
          'anchor': 'end',
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
        },
      },
    });
  },
  buildButtonDownAnimationDirective: function(context, targetGadgets) {
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
    context.response._addDirective(buttonDownDirective);
  },
  colorButton: function(context, buttonId, buttonColor, longPause) {
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

    // Pulse a few times white
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

    // Then solid white (long is an extra four seconds)
    buttonIdleDirective.parameters.animations[0].sequence.push({
      'durationMs': (longPause ? 8000 : 4000),
      'color': 'FFFFFF',
      'blend': false,
    });

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
    context.response._addDirective(buttonIdleDirective);
  },
  turnOffButtons: function(context) {
    const disableButtonDirective = {
      'type': 'GadgetController.SetLight',
      'version': 1,
      'targetGadgets': [],
      'parameters': {
        'animations': [{
          'repeat': 1,
          'targetLights': ['1'],
          'sequence': [
            {
              'durationMs': 400,
              'color': '000000',
              'blend': false,
            },
          ],
        }],
        'triggerEvent': 'none',
        'triggerEventTimeMs': 0,
      },
    };
    context.response._addDirective(disableButtonDirective);
  },
  addLaunchAnimation: function(context) {
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
    context.response._addDirective(buttonIdleDirective);
  },
};

