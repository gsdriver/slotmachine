//
// Handles purchasing of premium content
//

'use strict';

const utils = require('../utils');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    if ((request.type === 'IntentRequest') && attributes.paid && attributes.paid.resetcoins
      && ((!attributes.temp.purchasing && (request.intent.name === 'PurchaseIntent')) ||
       (attributes.temp.purchasing &&
        ((request.intent.name === 'AMAZON.YesIntent') || (request.intent.name === 'AMAZON.NoIntent'))))) {
      return true;
    }

    attributes.temp.purchasing = undefined;
    return false;
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);

    if (attributes.temp.purchasing) {
      if (event.request.intent.name === 'AMAZON.YesIntent') {
        handlerInput.responseBuilder
          .addDirective(utils.getPurchaseDirective(attributes, 'Buy'))
          .withShouldEndSession(true);
      } else {
        attributes.temp.purchasing = undefined;
        handlerInput.responseBuilder
          .speak(res.strings.PURCHASE_NO_PURCHASE)
          .reprompt(res.strings.PURCHASE_NO_PURCHASE);
      }
    } else {
      if (event.request.intent.slots && event.request.intent.slots.Product
        && event.request.intent.slots.Product.value) {
        // They specified a product - we'll assume it's Reset Bankroll
        // since that's all we support for now
        handlerInput.responseBuilder
          .addDirective(utils.getPurchaseDirective(attributes, 'Buy'))
          .withShouldEndSession(true);
      } else {
        // Prompt them
        attributes.temp.purchasing = true;
        handlerInput.responseBuilder
          .speak(res.strings.PURCHASE_RESETBANKROLL)
          .reprompt(res.strings.PURCHASE_CONFIRM_REPROMPT);
      }
    }
  },
};
