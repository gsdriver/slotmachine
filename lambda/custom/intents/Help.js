//
// Handles stop, which will exit the skill
//

'use strict';

const utils = require('../utils');
const ri = require('@jargon/alexa-skill-sdk').ri;

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return ((request.type === 'IntentRequest') &&
      ((request.intent.name === 'AMAZON.HelpIntent') ||
      (request.intent.name === 'AMAZON.FallbackIntent')));
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const bankroll = utils.getBankroll(attributes);
    const rules = utils.getGame(attributes.currentGame);
    let speech;

    // If this was fallback intent, let them know we didn't understand first
    attributes.temp.speechParams.FallbackText =
      (event.request.intent.name === 'AMAZON.FallbackIntent')
        ? utils.getResource(handlerInput, 'HELP_FALLBACK') : '';

    attributes.temp.readingRules = false;
    if (attributes.choices && (attributes.choices.length > 0)) {
      // If selecting a game, help string is different
      attributes.temp.repromptParams.Game = utils.sayGame(event, attributes.choices[0]);
      Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);

      return handlerInput.jrb
        .speak(ri('HELP_SELECT_TEXT', attributes.temp.speechParams))
        .reprompt(ri('LAUNCH_REPROMPT', attributes.temp.repromptParams))
        .getResponse();
    } else {
      const cardParams = {PayoutTable: utils.readPayoutTable(event, rules)};

      if (attributes.currentGame == 'tournament') {
        // Give some details about the tournament
        speech = 'HELP_IN_TOURNAMENT';
        attributes.temp.speechParams.Time = utils.getRemainingTournamentTime(handlerInput);
        attributes.temp.speechParams.Coins = utils.TOURNAMENT_PAYOUT;
        attributes.temp.speechParams.Amount = utils.readCoins(event, bankroll);
      } else {
        speech = 'HELP_NO_TOURNAMENT';
        attributes.temp.speechParams.Amount = utils.readCoins(event, bankroll);
      }

      if (!attributes.temp.tournamentAvailable) {
        return new Promise((resolve, reject) => {
          utils.getLocalTournamentTime(event, (tournamentTime) => {
            if (tournamentTime) {
              speech = 'HELP_UPCOMING_TOURNAMENT';
              attributes.temp.speechParams.Time = tournamentTime;
              attributes.temp.speechParams.Coins = utils.TOURNAMENT_PAYOUT;
            }

            const response = handlerInput.jrb
              .speak(ri(speech, attributes.temp.speechParams))
              .reprompt(ri('HELP_REPROMPT'))
              .withSimpleCard(ri('HELP_CARD_TITLE'), ri('HELP_CARD_PAYOUT_TABLE', cardParams))
              .getResponse();
            resolve(response);
          });
        });
      } else {
        return handlerInput.jrb
          .speak(ri(speech, attributes.temp.speechParams))
          .reprompt(ri('HELP_REPROMPT'))
          .withSimpleCard(ri('HELP_CARD_TITLE'), ri('HELP_CARD_PAYOUT_TABLE', cardParams))
          .getResponse();
      }
    }
  },
};
