//
// Handles entering test mode - to force the user to run out of money
//

'use strict';

const ri = require('@jargon/alexa-skill-sdk').ri;

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    if ((request.type === 'IntentRequest') && (request.intent.name === 'GameIntent')) {
      // It has to be game 99 that you are selecting
      if (request.intent.slots && request.intent.slots.Number
        && request.intent.slots.Number.value) {
        const game = parseInt(request.intent.slots.Number.value);
        return (game === 99);
      }
    }

    // Process confirmation prompt (yes or no)
    if ((request.type === 'IntentRequest') && attributes.temp.confirmTest
      && ((request.intent.name === 'AMAZON.YesIntent') || (request.intent.name === 'AMAZON.NoIntent'))) {
      return true;
    }

    // Anything else and we clear this flag
    attributes.temp.confirmTest = undefined;
    return false;
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    let speech;
    let reprompt;

    return new Promise((resolve, reject) => {
      if (event.request.intent.name === 'GameIntent') {
        // Confirm
        attributes.temp.confirmTest = true;
        speech = 'TEST_CONFIRM_BANKRUPT';
        reprompt = 'TEST_CONFIRM_BANKRUPT_REPROMPT';
      } else {
        attributes.temp.confirmTest = undefined;
        if (event.request.intent.name === 'AMAZON.YesIntent') {
          // OK, set them up to lose
          attributes.bankroll = 1;
          attributes.temp.testBankrupt = true;
          speech = 'TEST_BANKRUPT_SET';
          reprompt = 'TEST_BANKRUPT_REPROMPT';
        } else {
          speech = 'TEST_BANKRUPT_NOT_SET';
          reprompt = 'TEST_BANKRUPT_NOT_SET_REPROMPT';
        }
      }

      const response = handlerInput.jrb
        .speak(ri(speech))
        .reprompt(ri(reprompt))
        .getResponse();
      resolve(response);
    });
  },
};
