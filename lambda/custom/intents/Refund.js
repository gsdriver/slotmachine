//
// Handles refund of premium content
//

'use strict';

const utils = require('../utils');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return ((request.type === 'IntentRequest') && attributes.paid && attributes.paid.resetcoins
      && (attributes.paid.resetcoins.state == 'PURCHASED')
      && (request.intent.name === 'RefundIntent'));
  },
  handle: function(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    handlerInput.responseBuilder
      .addDirective(utils.getPurchaseDirective(attributes, 'Cancel'))
      .withShouldEndSession(true);
  },
};
