//
// Handles stop, which will exit the skill
//

'use strict';

const utils = require('../utils');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return ((request.type === 'IntentRequest') && (request.intent.name === 'RulesIntent'));
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);
    let speech = '';
    let payout;
    let reprompt;
    let rules;

    if (attributes.choices && (attributes.choices.length > 0)) {
      reprompt = res.strings.RULES_SELECT_REPROMPT;
      rules = utils.getGame(attributes.choices[0]);
    } else {
      reprompt = res.strings.RULES_REPROMPT;
      rules = utils.getGame(attributes.currentGame);
    }

    // Wild symbols
    if (rules.special) {
      speech += res.strings[rules.special];
    }

    for (payout in rules.payouts) {
      if (payout && (rules.payouts[payout] >= 1)) {
        speech += utils.readPayout(event, rules, payout);
        speech += utils.readPayoutAmount(event, rules, payout);
        speech += ' <break time=\"200ms\"/>';
      }
    }

    speech += reprompt;

    attributes.temp.readingRules = true;
    return handlerInput.responseBuilder
      .speak(speech)
      .reprompt(reprompt)
      .withSimpleCard(res.strings.RULES_CARD_TITLE, utils.readPayoutTable(event, rules))
      .getResponse();
  },
};
