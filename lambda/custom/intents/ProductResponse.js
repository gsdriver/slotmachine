//
// Handles response from Product purchase, upsell, or refund
//

'use strict';

const Launch = require('./Launch');
const Select = require('./Select');
const SelectYes = require('./SelectYes');
const Spin = require('./Spin');
const buttons = require('../buttons');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const SNS = new AWS.SNS();
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return (request.type === 'Connections.Response');
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    let promise;

    // First write out to S3
    const summary = {
      token: event.request.token,
      action: event.request.name,
      userId: event.session.user.userId,
      response: event.request.payload.purchaseResult,
    };
    if (attributes.upsellSelection) {
      summary.selection = attributes.upsellSelection;
    }
    const params = {
      Body: JSON.stringify(summary),
      Bucket: 'garrett-alexa-usage',
      Key: 'slots-upsell/' + Date.now() + '.txt',
    };

    if (process.env.SNSTOPIC) {
      promise = s3.putObject(params).promise().then(() => {
        // Publish to SNS if the action was accepted so we know something happened
        if (event.request.payload.purchaseResult === 'ACCEPTED') {
          let message;

          // This message is sent internally so no worries about localizing
          message = 'For token ' + event.request.token + ' (' + attributes.playerLocale + '), ';
          if (event.request.payload.message) {
            message += event.request.payload.message;
          } else {
            message += event.request.name + ' was accepted';
          }
          message += ' by user ' + event.session.user.userId;
          if (attributes.upsellSelection) {
            message += '\nUpsell variant ' + attributes.upsellSelection + ' was presented. ';
          }

          return SNS.publish({
            Message: message,
            TopicArn: process.env.SNSTOPIC,
            Subject: 'Slot Machine New Purchase',
          }).promise();
        } else {
          return;
        }
      });
    } else {
      promise = Promise.resolve();
    }

    return promise.then(() => {
      // Launch processing will handle updating the bankroll as necessary
      // We just need to check if they declined an upsell request
      // to avoid an infinite loop
      const options = event.request.token.split('.');
      const accepted = (event.request.payload &&
        ((event.request.payload.purchaseResult == 'ACCEPTED') ||
        (event.request.payload.purchaseResult == 'ALREADY_PURCHASED')));
      let nextAction = 'launch';

      attributes.upsellSelection = undefined;
      if ((event.request.name === 'Upsell') && !accepted) {
        // Don't upsell them again on the next round
        attributes.temp.noUpsell = true;
      }

      // Figure out next step if this was a machine upsell
      if (options[0] === 'machine') {
        // Did they accept?
        if (accepted) {
          // If this is was a cancel remove it - otherwise select this
          if (event.request.name === 'Cancel') {
            attributes[options[1]] = undefined;
            if (attributes.currentGame === options[1]) {
              attributes.currentGame = 'basic';
            }
            if (attributes.paid && attributes.paid[options[1]]) {
              attributes.paid[options[1]].state = 'AVAILABLE';
            }
          } else {
            // We'll auto-select
            // Make sure we put it into the list of paid products as purchased
            if (attributes.paid && attributes.paid[options[1]]) {
              attributes.paid[options[1]].state = 'PURCHASED';
            }
            nextAction = 'autoselect';
          }
        } else {
          // OK, either launch, spin, or go to select based on last step
          nextAction = options[2];
        }
      }

      // And go to the appropriate next step
      if (nextAction === 'select') {
        buttons.setRepromptHandler(handlerInput, 20000);
        return Select.handle(handlerInput);
      } else if (nextAction === 'autoselect') {
        buttons.setRepromptHandler(handlerInput, 20000);
        attributes.choices = [options[1]];
        return SelectYes.handle(handlerInput);
      } else if (nextAction === 'spin') {
        return Spin.handle(handlerInput);
      } else {
        // Just drop them directly into a game
        attributes.temp.resumeGame = true;
        return Launch.handle(handlerInput);
      }
    });
  },
};
