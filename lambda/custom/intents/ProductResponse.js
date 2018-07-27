//
// Handles response from Product purchase, upsell, or refund
//

'use strict';

const Launch = require('./Launch');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (request.type === 'Connections.Response');
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // Launch processing will handle updating the bankroll as necessary
    // We just need to check if they declined an upsell request
    // to avoid an infinite loop
    console.log('Response is ' + event.request.name);
    if ((event.request.name === 'Upsell') &&
      !(event.request.payload &&
        ((event.request.payload.purchaseResult == 'ACCEPTED') ||
         (event.request.payload.purchaseResult == 'ALREADY_PURCHASED')))) {
      attributes.temp.noUpsell = true;
    }

    Launch.handle(handlerInput);
  },
};
