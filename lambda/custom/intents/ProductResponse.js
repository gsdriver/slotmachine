//
// Handles response from Product purchase, upsell, or refund
//

'use strict';

const Launch = require('./Launch');
const Select = require('./Select');
const SelectYes = require('./SelectYes');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const SNS = new AWS.SNS();

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (request.type === 'Connections.Response');
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return new Promise((resolve, reject) => {
      // Publish to SNS so we know something happened
      if (process.env.SNSTOPIC) {
        const start = Date.now();
        SNS.publish({
          Message: event.request.name + 'with token ' + event.request.token
            + ' was ' + event.request.payload.purchaseResult
            + ' by user ' + event.session.user.userId,
          TopicArn: process.env.SNSTOPIC,
          Subject: 'Slot Machine Purchase Response',
        }, (err, data) => {
          if (err) {
            console.log(err);
          }
          console.log('SNS post took ' + (Date.now() - start) + ' ms');
          done();
        });
      } else {
        done();
      }

      function done() {
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

        // If this was a game upsell, take them back to select game
        const options = event.request.token.split('.');
        if ((options.length === 2) && (options[0] === 'select')) {
          // Did they accept the upsell?
          if ((event.request.name === 'Upsell') && event.request.payload
            && ((event.request.payload.purchaseResult == 'ACCEPTED') ||
             (event.request.payload.purchaseResult == 'ALREADY_PURCHASED'))) {
            // Auto select it
            attributes.choices = [options[1]];
            SelectYes.handle(handlerInput)
            .then((response) => {
              resolve(response);
            });
          } else {
            // Go back to selecting a game
            attributes.temp.noUpsellGame = true;
            resolve(Select.handle(handlerInput));
          }
        } else {
          // We will drop them directly into a game
          attributes.temp.resumeGame = true;
          Launch.handle(handlerInput)
          .then((response) => {
            resolve(response);
          });
        }
      }
    });
  },
};
