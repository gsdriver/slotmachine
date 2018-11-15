//
// Handles listing the products you've purchased
// If they don't have anything that they've bought - why not upsell them?
//

'use strict';

const upsell = require('../UpsellEngine');
const ri = require('@jargon/alexa-skill-sdk').ri;
const speechUtils = require('alexa-speech-utils')();

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return ((request.type === 'IntentRequest')
      && attributes.paid && (request.intent.name === 'ListPurchasesIntent'));
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return handlerInput.jrm.renderObject(ri('PURCHASE_PRODUCT_LIST'))
    .then((productMap) => {
      const availableProducts = [];
      const purchasedProducts = [];
      let product;
      let speech;

      for (product in attributes.paid) {
        if (product && productMap[product]) {
          if (attributes.paid[product].state === 'PURCHASED') {
            purchasedProducts.push(productMap[product]);
          } else if (attributes.paid[product].state === 'AVAILABLE') {
            availableProducts.push(productMap[product]);
          }
        }
      }

      if (purchasedProducts.length > 0) {
        attributes.temp.speechParams.Products =
          speechUtils.and(purchasedProducts, {pause: '300ms', locale: event.request.locale});
        speech = 'LISTPURCHASES_PURCHASED';
      } else if (availableProducts.length > 0) {
        // Let's upsell them!
        const directive = upsell.getUpsell(attributes, 'listpurchases');
        if (directive) {
          directive.token = 'machine.' + directive.token + '.launch';
          return handlerInput.responseBuilder
            .addDirective(directive)
            .withShouldEndSession(true)
            .getResponse();
        } else {
          speech = 'LISTPURCHASES_NONE';
        }
      } else {
        // Nothing purchased - nothing available
        speech = 'LISTPURCHASES_NONE';
      }

      return handlerInput.jrb
        .speak(ri(speech, attributes.temp.speechParams))
        .reprompt(ri('LISTPURCHASE_REPROMPT'))
        .getResponse();
    });
  },
};
