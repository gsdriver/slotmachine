//
// Handles stop, which will exit the skill
//

'use strict';

const ads = require('../ads');
const ri = require('@jargon/alexa-skill-sdk').ri;
const utils = require('../utils');

module.exports = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // If you say 99, we'll exit and prompt for a reminder
    if ((request.type === 'IntentRequest') && (request.intent.name === 'GameIntent')) {
      // It has to be game 99 that you are selecting
      if (request.intent.slots && request.intent.slots.Number
        && request.intent.slots.Number.value) {
        const game = parseInt(request.intent.slots.Number.value);
        return (game === 99);
      }
    }

    // Can always handle with Stop and Cancel
    if (request.type === 'IntentRequest') {
      if (request.intent.name === 'AMAZON.CancelIntent') {
        return true;
      }
      if (request.intent.name === 'AMAZON.NoIntent') {
        return (!attributes.choices || !attributes.choices.length);
      }
      if (request.intent.name === 'AMAZON.StopIntent') {
        return (!attributes.temp.readingRules);
      }
    }

    return false;
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const forceReminder = (event.request.intent.name === 'GameIntent');

    // An upcoming tournament takes precedence
    return utils.timeUntilTournament(handlerInput)
    .then((time) => {
      let timeLeft = time;
      if (!timeLeft && forceReminder) {
        timeLeft = ' ';
      }

      if (!timeLeft) {
        return ads.getAd(attributes, 'slots', event.request.locale);
      } else {
        // Do they have an active reminder set for this weekly tournament?
        return utils.isReminderActive(handlerInput)
        .then((isActive) => {
          if (!isActive) {
            // We are going to go into reminder mode!
            attributes.temp.addingReminder = true;
          }
          return timeLeft;
        });
      }
    }).then((adText) => {
      if (attributes.temp.addingReminder) {
        attributes.temp.speechParams.RemainingTime = adText;
        return handlerInput.jrb
          .speak(ri('EXIT_REMINDER', attributes.temp.speechParams))
          .reprompt(ri('EXIT_REMINDER_REPROMPT'))
          .getResponse();
      } else {
        attributes.temp.speechParams.Ad = adText;
        return handlerInput.jrb
          .speak(ri('EXIT_GAME', attributes.temp.speechParams))
          .withShouldEndSession(true)
          .getResponse();
      }
    });
  },
};
