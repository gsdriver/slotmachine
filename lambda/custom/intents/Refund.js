//
// Handles refund of premium content
//

'use strict';

const utils = require('../utils');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    let canRefund = false;

    if ((request.type === 'IntentRequest') && (request.intent.name === 'RefundIntent') && attributes.paid) {
      // Let's see if anything is purchased to refund
      let product;

      for (product in attributes.paid) {
        if (product && attributes.paid[product] && (attributes.paid[product].state === 'PURCHASED')) {
          canRefund = true;
        }
      }
    }

    return canRefund;
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);

    if (event.request.intent.slots && event.request.intent.slots.Product
      && event.request.intent.slots.Product.value) {
      const product = res.mapProduct(event.request.intent.slots.Product.value);
      const token = (product === 'coinreset') ? 'subscribe.coinreset.refund' : ('machine.' + product + '.refund');
      return handlerInput.responseBuilder
        .addDirective(utils.getPurchaseDirective(attributes, product, 'Cancel', token))
        .withShouldEndSession(true)
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(res.strings.REFUND_SAY_PRODUCT)
        .reprompt(res.strings.REFUND_SAY_PRODUCT)
        .getResponse();
    }
  },
};
