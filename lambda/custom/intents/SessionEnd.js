//
// Saves attributes at the end of the session
//

'use strict';

const buttons = require('../buttons');
const upsell = require('../UpsellEngine');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

module.exports = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // If we get a session end timeout, we'll process it
    if (request.type === 'GameEngine.InputHandlerEvent') {
      const timeout = buttons.timedOut(handlerInput);
      return ((timeout === 'sessionend') && !attributes.temp.ignoreTimeouts);
    }

    return (request.type === 'SessionEndedRequest');
  },
  handle: function(handlerInput) {
    console.log('End session - saving attributes');
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // Clear and persist attributes
    return upsell.saveSession(handlerInput)
    .then(() => {
      if (attributes.temp.spinButton || attributes.temp.spinNoButton) {
        const data = {
          length: Date.now() - attributes.temp.sessionStart,
          locale: handlerInput.requestEnvelope.request.locale,
          spinButton: attributes.temp.spinButton,
          spinNoButton: attributes.temp.spinNoButton,
        };
        const params = {
          Body: JSON.stringify(data),
          Bucket: 'garrett-alexa-usage',
          Key: 'spins/slots/' + Date.now() + '.txt',
        };
        return s3.putObject(params).promise();
      } else {
        return Promise.resolve();
      }
    }).then(() => {
      attributes.temp = undefined;
      handlerInput.attributesManager.setPersistentAttributes(attributes);
      handlerInput.attributesManager.savePersistentAttributes();
    });
  },
};
