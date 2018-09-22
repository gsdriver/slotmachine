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
          Message: event.request.name + ' with token ' + event.request.token
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
        const options = event.request.token.split('.');
        const accepted = (event.request.payload &&
          ((event.request.payload.purchaseResult == 'ACCEPTED') ||
          (event.request.payload.purchaseResult == 'ALREADY_PURCHASED')));
        let nextAction = 'launch';

        if ((event.request.name === 'Upsell') && !accepted) {
          // Don't upsell them again
          if (options[1] === 'coinreset') {
            attributes.temp.noUpsell = true;
          }
          if (options[0] === 'machine') {
            attributes.temp.noUpsellGame = true;
          }
        }

        // Figure out next step if this was a machine upsell
        if (options[0] === 'machine') {
          // Did they accept?
          if (accepted) {
            // If this is was a cancel remove it - otherwise select this
            if (event.request.name === 'Cancel') {
              attributes[options[1]] = undefined;
              if (attributes.currentGame === options[1]) {
                attributes.currentGame = 'standard';
              }
            } else {
              // We'll auto-select
              nextAction = 'autoselect';
            }
          } else {
            // OK, either launch or go to select based on last step
            nextAction = (options[2] === 'select') ? 'select' : 'launch';
          }
        }

        // And go to the appropriate next step
        if (nextAction === 'select') {
          resolve(Select.handle(handlerInput));
        } else if (nextAction === 'autoselect') {
          attributes.choices = [options[1]];
          SelectYes.handle(handlerInput)
          .then((response) => {
            resolve(response);
          });
        } else {
          // Just drop them directly into a game
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
