//
// Handles purchasing of premium content
//

'use strict';

const utils = require('../utils');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    if ((request.type === 'IntentRequest')
      && ((attributes.paid && (request.intent.name === 'PurchaseIntent'))
      || (attributes.temp.purchasing && (request.intent.name === 'AMAZON.NoIntent')))) {
      return true;
    }

    attributes.temp.purchasing = undefined;
    return false;
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);
    let speech;
    let reprompt;

    if (attributes.temp.purchasing && (event.request.intent.name === 'AMAZON.NoIntent')) {
      attributes.temp.purchasing = undefined;
      speech = res.strings.PURCHASE_NO_PURCHASE;
      reprompt = res.strings.PURCHASE_NO_PURCHASE;
      return handlerInput.responseBuilder
        .speak(utils.ri(speech, attributes.temp.speechParams))
        .reprompt(utils.ri(reprompt, attributes.temp.repromptParams))
        .getResponse();
    } else {
      if (event.request.intent.slots && event.request.intent.slots.Product
        && event.request.intent.slots.Product.value) {
        // They specified a product so let's go with that one
        const product = utils.mapProduct(event.request.intent.slots.Product.value);
        const token = (product === 'coinreset') ? 'subscribe.coinreset.refund' : ('machine.' + product + '.refund');
        return handlerInput.responseBuilder
          .addDirective(utils.getPurchaseDirective(attributes, product, 'Buy', token))
          .withShouldEndSession(true)
          .getResponse();
      } else {
        // Prompt them with a list of available products
        speech = res.strings.PURCHASE_PRODUCTS;
        attributes.temp.speechParams.Products = res.strings.PURCHASE_PRODUCT_LIST;

        attributes.temp.purchasing = true;
        reprompt = res.strings.PURCHASE_CONFIRM_REPROMPT;
        return handlerInput.responseBuilder
          .speak(utils.ri(speech, attributes.temp.speechParams))
          .reprompt(utils.ri(reprompt, attributes.temp.repromptParams))
          .getResponse();
      }
    }
  },
};
