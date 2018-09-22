//
// Handles purchasing of premium content
//

'use strict';

const utils = require('../utils');
const speechUtils = require('alexa-speech-utils')();

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

    if (attributes.temp.purchasing && (event.request.intent.name === 'AMAZON.NoIntent')) {
      attributes.temp.purchasing = undefined;
      return handlerInput.responseBuilder
        .speak(res.strings.PURCHASE_NO_PURCHASE)
        .reprompt(res.strings.PURCHASE_NO_PURCHASE)
        .getResponse();
    } else {
      if (event.request.intent.slots && event.request.intent.slots.Product
        && event.request.intent.slots.Product.value) {
        // They specified a product so let's go with that one
        const product = res.mapProduct(event.request.intent.slots.Product.value);
        const token = (product === 'coinreset') ? 'subscribe.coinreset.refund' : ('machine.' + product + '.refund');
        return handlerInput.responseBuilder
          .addDirective(utils.getPurchaseDirective(attributes, product, 'Buy', token))
          .withShouldEndSession(true)
          .getResponse();
      } else {
        // Prompt them with a list of available products
        const speech = res.strings.PURCHASE_PRODUCT_LIST
          .replace('{0}', speechUtils.and([res.strings.PURCHASE_RESETBANKROLL, res.strings.PURCHASE_CRAZYDIAMOND],
            {locale: event.request.locale}));

        attributes.temp.purchasing = true;
        return handlerInput.responseBuilder
          .speak(speech)
          .reprompt(res.strings.PURCHASE_CONFIRM_REPROMPT)
          .getResponse();
      }
    }
  },
};
