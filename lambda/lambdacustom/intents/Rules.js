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
    let payoutTable;

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
    let promise;
    if (rules.special) {
      promise = handlerInput.jrm.render(ri(rules.special));
    } else {
      promise = Promise.resolve('');
    }
    return promise.then((text) => {
      const renderItems = [];

      attributes.temp.speechParams.SpecialText = text;
      for (payout in rules.payouts) {
        if (payout) {
          if (rules.progressive && (rules.progressive.match === payout)) {
            renderItems.push(ri('PAYOUT_RATES_PROGRESSIVE'));
          } else {
            renderItems.push(ri('PAYOUT_RATES_COINS', {Coins: rules.payouts[payout]}));
          }
        }
      }

      return handlerInput.jrm.renderBatch(renderItems);
    }).then((payoutAmounts) => {
      attributes.temp.speechParams.PayoutTable = '';

      let i = 0;
      for (payout in rules.payouts) {
        if (payout && (rules.payouts[payout] >= 1)) {
          attributes.temp.speechParams.PayoutTable +=
            utils.readPayout(handlerInput, rules, payout);
          attributes.temp.speechParams.PayoutTable += payoutAmounts[i++];
          attributes.temp.speechParams.PayoutTable +=
            ' <break time=\"200ms\"/>';
        }
      }

      attributes.temp.readingRules = true;
      return utils.readPayoutTable(handlerInput, rules);
    }).then((table) => {
      payoutTable = table;
      const content = [
        ri(speech, attributes.temp.speechParams),
        ri(reprompt),
        ri('RULES_CARD_TITLE'),
      ];

      return handlerInput.jrm.renderBatch(content);
    }).then((items) => {
      return handlerInput.responseBuilder
        .speak(items[0])
        .reprompt(items[1])
        .withSimpleCard(items[2], payoutTable)
        .getResponse();
    });
  },
};
