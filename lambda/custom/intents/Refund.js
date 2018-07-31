//
// Handles refund of premium content
//

'use strict';

const utils = require('../utils');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    if ((request.type === 'IntentRequest') && attributes.paid && attributes.paid.coins
      && ((!attributes.temp.refunding && (request.intent.name === 'RefundIntent')) ||
       (attributes.temp.refunding &&
        ((request.intent.name === 'AMAZON.YesIntent') || (request.intent.name === 'AMAZON.NoIntent'))))) {
      return true;
    }

    attributes.temp.refunding = undefined;
    return false;
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);

    if (attributes.temp.refunding) {
      // In the middle of refunding
      if (event.request.intent.name === 'AMAZON.YesIntent') {
        handlerInput.responseBuilder
          .addDirective(utils.getPurchaseDirective(attributes, 'Cancel'))
          .withShouldEndSession(true);
      } else {
        // They don't want to cancel - just repeat
        attributes.temp.refunding = undefined;
        handlerInput.responseBuilder
          .speak(res.strings.REFUND_NO_REFUND)
          .reprompt(res.strings.REFUND_NO_REFUND);
      }
    } else {
      attributes.temp.refunding = true;
      handlerInput.responseBuilder
        .speak(res.strings.REFUND_RESETBANKROLL)
        .reprompt(res.strings.REFUND_CONFIRM_REPROMPT);
    }
  },
};
