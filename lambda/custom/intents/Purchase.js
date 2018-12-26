//
// Handles purchasing of premium content
//

'use strict';

const utils = require('../utils');
const ri = require('@jargon/alexa-skill-sdk').ri;
const speechUtils = require('alexa-speech-utils')();
const SelectYes = require('./SelectYes');

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
      const product = utils.mapProduct(handlerInput);
      if (product) {
        if (!attributes.paid || !attributes.paid[product]) {
          // That really shouldn't happen
          return handlerInput.jrb
            .speak(ri('UNKNOWN_INTENT'))
            .reprompt(ri('UNKNOWN_INTENT_REPROMPT'))
            .getResponse();
        }

        // Do they have this machine already?  If so just select it
        if ((product !== 'coinreset') && attributes.paid && attributes.paid[product]
          && (attributes.paid[product].state === 'PURCHASED')) {
          attributes.choices = [product];
          return SelectYes.handle(handlerInput);
        }

        const token = (product === 'coinreset') ? 'subscribe.coinreset.launch' : ('machine.' + product + '.launch');
        return handlerInput.jrb
          .addDirective({
            'type': 'Connections.SendRequest',
            'name': 'Buy',
            'payload': {
              'InSkillProduct': {
                'productId': attributes.paid[product].productId,
              },
            },
            'token': token,
          })
          .withShouldEndSession(true)
          .getResponse();
      } else {
        // Prompt them with a list of available products
        attributes.temp.purchasing = true;
        return handlerInput.jrm.renderObject(ri('PURCHASE_PRODUCT_LIST'))
        .then((productMap) => {
          const availableProducts = [];
          let product;

          for (product in attributes.paid) {
            if (product && productMap[product] && (attributes.paid[product].state === 'AVAILABLE')) {
              availableProducts.push(productMap[product]);
            }
          }

          if (availableProducts.length) {
            attributes.temp.speechParams.Products =
              speechUtils.and(availableProducts, {pause: '300ms', locale: event.request.locale});
            return handlerInput.jrb
              .speak(ri('PURCHASE_PRODUCTS', attributes.temp.speechParams))
              .reprompt(ri('PURCHASE_CONFIRM_REPROMPT'))
              .getResponse();
          } else {
            return handlerInput.jrb
              .speak(ri('PURCHASE_NO_PRODUCTS'))
              .reprompt(ri('PURCHASE_NO_PURCHASE'))
              .getResponse();
          }
        });
      }
    }
  },
};
