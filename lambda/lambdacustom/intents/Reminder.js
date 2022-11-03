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
    if ((request.type === 'IntentRequest') && (request.intent.name === 'ReminderIntent')) {
      return true;
    }

    // Never mind, cancel the request for a reminder
    attributes.temp.addingReminder = undefined;
    return false;
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const endSession = (attributes.temp.addingReminder === 'onexit');
    let response;

    attributes.temp.addingReminder = undefined;
    if (event.request.intent.name === 'ReminderIntent') {
      return utils.isReminderActive(handlerInput)
      .then((isActive) => {
        if (!isActive) {
          attributes.temp.addingReminder = 'explicit';
          return utils.getLocalTournamentTime(handlerInput).then((result) => {
            if (!result) {
              return handlerInput.jrb
                .speak(ri('REMINDER_ERROR_EXPLICIT'))
                .reprompt(ri('REMINDER_REPROMPT'))
                .getResponse();
            }

            attributes.temp.speechParams.Time = result.time;
            attributes.temp.speechParams.Timezone = result.timezone;
            return handlerInput.jrb
              .speak(ri('REMINDER_SET_REMINDER', attributes.temp.speechParams))
              .reprompt(ri('REMINDER_SET_REPROMPT'))
              .getResponse();
          });
        } else {
          return handlerInput.jrb
            .speak(ri('REMINDER_ALREADY_SET'))
            .reprompt(ri('REMINDER_ALREADY_SET_REPROMPT'))
            .getResponse();
        }
      });
    } else if (event.request.intent.name === 'AMAZON.YesIntent') {
      // Let's see if we can add a reminder
      return utils.setTournamentReminder(handlerInput, endSession)
      .then((result) => {
        attributes.prompts.reminder = undefined;
        if (!result.errorCode) {
          attributes.setReminder = true;
          attributes.temp.speechParams.Time = result.time;
          attributes.temp.speechParams.Timezone = result.timezone;
          if (endSession) {
            response = handlerInput.jrb
              .speak(ri('REMINDER_SET', attributes.temp.speechParams))
              .withShouldEndSession(true)
              .getResponse();
          } else {
            response = handlerInput.jrb
              .speak(ri('REMINDER_SET_EXPLICIT', attributes.temp.speechParams))
              .reprompt(ri('REMINDER_REPROMPT'))
              .getResponse();
          }
        // We're going to assume all errors mean that we are unauthorized
        } else {
          // Get their permission to show a reminder
          // We will end the session and prompt again
          response = handlerInput.jrb
            .speak(ri('REMINDER_GRANT_PERMISSION'))
            .withAskForPermissionsConsentCard(['alexa::alerts:reminders:skill:readwrite'])
            .withShouldEndSession(true)
            .getResponse();
        }

        return response;
      });
    } else if (!endSession) {
      return handlerInput.jrb
        .speak(ri('REMINDER_REPROMPT'))
        .reprompt(ri('REMINDER_REPROMPT'))
        .getResponse();
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
