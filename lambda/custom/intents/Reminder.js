//
// Reminder intent
//

'use strict';

const ri = require('@jargon/alexa-skill-sdk').ri;
const utils = require('../utils');
const ads = require('../ads');

module.exports = {
  canHandle: function(handlerInput) {
    // We can handle if this is a yes or no and they were
    // being prompted to add a reminder
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    if ((request.type === 'IntentRequest') && attributes.temp.addingReminder
      && ((request.intent.name === 'AMAZON.YesIntent')
        || (request.intent.name === 'AMAZON.NoIntent'))) {
      return true;
    }

    // Never mind, cancel the request for a reminder
    attributes.temp.addingReminder = undefined;
    return false;
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    attributes.temp.addingReminder = undefined;
    if (event.request.intent.name === 'AMAZON.YesIntent') {
      // Let's see if we can add a reminder
      return utils.setTournamentReminder(handlerInput)
      .then((result) => {
        if (typeof result !== 'string') {
          attributes.setReminder = true;
          attributes.temp.speechParams.Time = result.time;
          attributes.temp.speechParams.Timezone = result.timezone;
          return handlerInput.jrb
            .speak(ri('REMINDER_SET', attributes.temp.speechParams))
            .withShouldEndSession(true)
            .getResponse();
        } else if (result === 'UNAUTHORIZED') {
          // Get their permission to show a reminder
          return handlerInput.jrb
            .speak(ri('REMINDER_GRANT_PERMISSION'))
            .withAskForPermissionsConsentCard(['alexa::alerts:reminders:skill:readwrite'])
            .withShouldEndSession(true)
            .getResponse();
        } else {
          // Some other problem not auth-related
          return handlerInput.jrb
            .speak(ri('REMINDER_ERROR'))
            .withShouldEndSession(true)
            .getResponse();
        }
      });
    } else {
      // They were exiting anyway - let's leave
      return ads.getAd(attributes, 'slots', event.request.locale)
      .then((adText) => {
        attributes.temp.speechParams.Ad = adText;
        return handlerInput.jrb
          .speak(ri('EXIT_GAME', attributes.temp.speechParams))
          .withShouldEndSession(true)
          .getResponse();
      });
    }
  },
};
