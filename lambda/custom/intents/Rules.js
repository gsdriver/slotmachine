//
// Handles stop, which will exit the skill
//

'use strict';

const utils = require('../utils');
const ri = require('@jargon/alexa-skill-sdk').ri;

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return ((request.type === 'IntentRequest') && (request.intent.name === 'RulesIntent'));
  },
  handle: function(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    let speech;
    let payout;
    let reprompt;
    let rules;

    return new Promise((resolve, reject) => {
      if (attributes.choices && (attributes.choices.length > 0)) {
        reprompt = 'RULES_SELECT_REPROMPT';
        speech = 'RULES_SELECT_RULES';
        rules = utils.getGame(attributes.choices[0]);
      } else {
        reprompt = 'RULES_REPROMPT';
        speech = 'RULES_RULES';
        rules = utils.getGame(attributes.currentGame);
      }

      // Wild symbols
      new Promise((resolve, reject) => {
        if (rules.special) {
          handlerInput.jrm.render(ri(rules.special)).then(resolve);
        } else {
          resolve('');
        }
      })
      .then((text) => {
        attributes.temp.speechParams.SpecialText = text;
        attributes.temp.speechParams.PayoutTable = '';
        for (payout in rules.payouts) {
          if (payout && (rules.payouts[payout] >= 1)) {
            attributes.temp.speechParams.PayoutTable +=
              utils.readPayout(handlerInput, rules, payout);
            attributes.temp.speechParams.PayoutTable +=
              utils.readPayoutAmount(handlerInput, rules, payout);
            attributes.temp.speechParams.PayoutTable +=
              ' <break time=\"200ms\"/>';
          }
        }

        attributes.temp.readingRules = true;
        const response = handlerInput.jrb
          .speak(ri(speech, attributes.temp.speechParams))
          .reprompt(ri(reprompt))
          .withSimpleCard('RULES_CARD_TITLE', utils.readPayoutTable(handlerInput, rules))
          .getResponse();
        resolve(response);
      });
    });
  },
};
