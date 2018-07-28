//
// Echo Button support functions
//

'use strict';

module.exports = {
  getPressedButton: function(request, attributes) {
    const gameEngineEvents = request.events || [];

    gameEngineEvents.forEach((engineEvent) => {
      // in this request type, we'll see one or more incoming events
      // corresponding to the StartInputHandler we sent above
      if (engineEvent.name === 'timeout') {
        console.log('Timed out waiting for button');
      } else if (engineEvent.name === 'button_down_event') {
        // save id of the button that triggered event
        console.log('Received button down request');
        attributes.usedButton = true;
        attributes.temp.buttonId = engineEvent.inputEvents[0].gadgetId;
      }
    });

    return (attributes.temp.buttonId);
  },
  startInputHandler: function(handlerInput) {
    // We'll allow them to press the button again
    handlerInput.responseBuilder.addDirective({
      'type': 'GameEngine.StartInputHandler',
      'timeout': 30000,
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
  buildButtonDownAnimationDirective: function(handlerInput, targetGadgets) {
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

    handlerInput.responseBuilder.addDirective(buttonDownDirective);
  },
  colorButton: function(handlerInput, buttonId, buttonColor) {
    // Pulse the button based on whether they won or lost
    const buttonIdleDirective = {
      'type': 'GadgetController.SetLight',
      'version': 1,
      'targetGadgets': [buttonId],
      'parameters': {
        'animations': [{
          'repeat': 1,
          'targetLights': ['1'],
          'sequence': [{
            'durationMs': 5000,
            'color': 'FFFFFF',
            'blend': true,
          }],
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
        'color': buttonColor,
        'blend': true,
      });
      buttonIdleDirective.parameters.animations[0].sequence.push({
        'durationMs': 300,
        'color': '000000',
        'blend': true,
      });
    }

    handlerInput.responseBuilder
      .addDirective(buttonIdleDirective)
      .addDirective(utils.buildButtonDownAnimationDirective(
          [buttonId]));
  },
  disableButtons: function(handlerInput) {
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

    handlerInput.responseBuilder
      .addDirective(disableButtonDirective);
  },
  addButtons: function(handlerInput) {
    // Build idle breathing animation that will play immediately
    // and button down animation for when the button is pressed
    module.exports.startInputHandler(handlerInput);
    const breathAnimation = buildBreathAnimation('000000', 'FFFFFF', 30, 1200);
    const idleDirective = {
      'type': 'GadgetController.SetLight',
      'version': 1,
      'targetGadgets': [],
      'parameters': {
        'animations': [{
          'repeat': 100,
          'targetLights': ['1'],
          'sequence': breathAnimation,
        }],
        'triggerEvent': 'none',
        'triggerEventTimeMs': 0,
      },
    };

    handlerInput.responseBuilder.addDirective(idleDirective);
  },
};

function buildBreathAnimation(fromRgbHex, toRgbHex, steps, totalDuration) {
  const halfSteps = steps / 2;
  const halfTotalDuration = totalDuration / 2;
  return buildSeqentialAnimation(fromRgbHex, toRgbHex, halfSteps, halfTotalDuration)
    .concat(buildSeqentialAnimation(toRgbHex, fromRgbHex, halfSteps, halfTotalDuration));
};

function buildSeqentialAnimation(fromRgbHex, toRgbHex, steps, totalDuration) {
  const fromRgb = parseInt(fromRgbHex, 16);
  let fromRed = fromRgb >> 16;
  let fromGreen = (fromRgb & 0xff00) >> 8;
  let fromBlue = fromRgb & 0xff;

  const toRgb = parseInt(toRgbHex, 16);
  const toRed = toRgb >> 16;
  const toGreen = (toRgb & 0xff00) >> 8;
  const toBlue = toRgb & 0xff;

  const deltaRed = (toRed - fromRed) / steps;
  const deltaGreen = (toGreen - fromGreen) / steps;
  const deltaBlue = (toBlue - fromBlue) / steps;

  const oneStepDuration = Math.floor(totalDuration / steps);

  const result = [];

  for (let i = 0; i < steps; i++) {
    result.push({
      'durationMs': oneStepDuration,
      'color': '' + n2h(fromRed) + n2h(fromGreen) + n2h(fromBlue),
      'intensity': 255,
      'blend': true,
    });
    fromRed += deltaRed;
    fromGreen += deltaGreen;
    fromBlue += deltaBlue;
  }

  return result;
};

// number to hex with leading zeroes
function n2h(n) {
  return ('00' + (Math.floor(n)).toString(16)).substr(-2);
};
