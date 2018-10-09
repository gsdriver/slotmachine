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

    if ((request.type === 'IntentRequest') && attributes.temp.confirmRefund
      && ((request.intent.name === 'AMAZON.YesIntent') || (request.intent.name === 'AMAZON.NoIntent'))) {
      return true;
    }
    attributes.temp.confirmRefund = undefined;

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

    if (attributes.temp.confirmRefund) {
      if (event.request.intent.name === 'AMAZON.YesIntent') {
        const productId = attributes.paid[attributes.temp.confirmRefund].productId;
        attributes.temp.confirmRefund = undefined;
        const token = (attributes.temp.confirmRefund === 'coinreset')
          ? 'subscribe.coinreset.launch'
          : ('machine.' + attributes.temp.confirmRefund + '.launch');
        return handlerInput.jrb
          .addDirective({
            'type': 'Connections.SendRequest',
            'name': 'Cancel',
            'payload': {
              'InSkillProduct': {
                'productId': productId,
              },
            },
            'token': token,
          })
          .withShouldEndSession(true)
          .getResponse();
      } else {
        return handlerInput.jrb
          .speak(ri('REFUND_NO_CANCEL'))
          .reprompt(ri('REFUND_NO_CANCEL_REPROMPT'))
          .getResponse();
      }
    } else if (event.request.intent.slots && event.request.intent.slots.Product
      && event.request.intent.slots.Product.value) {
      return utils.mapProduct(handlerInput, event.request.intent.slots.Product.value)
      .then((product) => {
        // Make sure they really want to refund
        const speech = (product === 'coinreset') ? 'REFUND_CONFIRM_COINRESET' : 'REFUND_CONFIRM_MACHINE';
        attributes.temp.speechParams.Product = event.request.intent.slots.Product.value;
        attributes.temp.repromptParams.Product = event.request.intent.slots.Product.value;
        attributes.temp.confirmRefund = product;
        return handlerInput.jrb
          .speak(ri(speech, attributes.temp.speechParams))
          .reprompt(ri('REFUND_CONFIRM_REPROMPT', attributes.temp.repromptParams))
          .getResponse();
      });
    } else {
      const speech = ri('REFUND_SAY_PRODUCT');
      return handlerInput.jrb
        .speak(speech)
        .reprompt(speech)
        .getResponse();
    }
  },
};
