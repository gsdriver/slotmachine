//
// Handles purchasing of premium content
//

'use strict';

const utils = require('../utils');
const ri = require('@jargon/alexa-skill-sdk').ri;

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

    if (attributes.temp.purchasing && (event.request.intent.name === 'AMAZON.NoIntent')) {
      attributes.temp.purchasing = undefined;
      return handlerInput.jrb
        .speak(ri('PURCHASE_NO_PURCHASE'))
        .reprompt(ri('PURCHASE_NO_PURCHASE'))
        .getResponse();
    } else {
      if (event.request.intent.slots && event.request.intent.slots.Product
        && event.request.intent.slots.Product.value) {
        // They specified a product so let's go with that one
        const product = utils.mapProduct(event.request.intent.slots.Product.value);
        const token = (product === 'coinreset') ? 'subscribe.coinreset.launch' : ('machine.' + product + '.launch');
        return handlerInput.jrb
          .addDirective(utils.getPurchaseDirective(attributes, product, 'Buy', token))
          .withShouldEndSession(true)
          .getResponse();
      } else {
        // Prompt them with a list of available products
        attributes.temp.purchasing = true;
        return handlerInput.jrb
          .speak(ri('PURCHASE_PRODUCTS', attributes.temp.speechParams))
          .reprompt(ri('PURCHASE_CONFIRM_REPROMPT'))
          .getResponse();
      }
    }
  },
};
