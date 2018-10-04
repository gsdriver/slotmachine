//
// Handles refund of premium content
//

'use strict';

const utils = require('../utils');
const ri = require('@jargon/alexa-skill-sdk').ri;

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
    let response;

    return new Promise((resolve, reject) => {
      if (event.request.intent.slots && event.request.intent.slots.Product
        && event.request.intent.slots.Product.value) {
        const product = utils.mapProduct(event.request.intent.slots.Product.value);
        const token = (product === 'coinreset') ? 'subscribe.coinreset.launch' : ('machine.' + product + '.launch');
        response = handlerInput.jrb
          .addDirective({
            'type': 'Connections.SendRequest',
            'name': 'Cancel',
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
        const speech = ri('REFUND_SAY_PRODUCT');
        reponse = handlerInput.jrb
          .speak(speech)
          .reprompt(speech)
          .getResponse();
      }
      resolve(response);
    });
  },
};
