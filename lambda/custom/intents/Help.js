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
    let promise;

    // If this was fallback intent, let them know we didn't understand first
    if (event.request.intent.name === 'AMAZON.FallbackIntent') {
      promise = handlerInput.jrm.render(ri('HELP_FALLBACK'));
    } else {
      promise = Promise.resolve('');
    }

    return promise.then((text) => {
      attributes.temp.speechParams.FallbackText = text;
      attributes.temp.readingRules = false;
      if (attributes.choices && (attributes.choices.length > 0)) {
        // If selecting a game, help string is different
        return handlerInput.jrm.render(ri('GAME_LIST_' + attributes.choices[0].toUpperCase()))
        .then((game) => {
          attributes.temp.repromptParams.Game = game;
          Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);

          return handlerInput.jrb
            .speak(ri('HELP_SELECT_TEXT', attributes.temp.speechParams))
            .reprompt(ri('LAUNCH_REPROMPT', attributes.temp.repromptParams))
            .getResponse();
        });
      } else {
        const cardParams = {PayoutTable: utils.readPayoutTable(handlerInput, rules)};

        if (attributes.currentGame === 'tournament') {
          // Give some details about the tournament
          speech = 'HELP_IN_TOURNAMENT';
          attributes.temp.speechParams.Coins = utils.TOURNAMENT_PAYOUT;
          attributes.temp.speechParams.Amount = bankroll;
          return utils.getRemainingTournamentTime(handlerInput).then((text) => {
            attributes.temp.speechParams.Time = text;
            return handlerInput.jrb
              .speak(ri(speech, attributes.temp.speechParams))
              .reprompt(ri('HELP_REPROMPT'))
              .withSimpleCard(ri('HELP_CARD_TITLE'), ri('HELP_CARD_PAYOUT_TABLE', cardParams))
              .getResponse();
          });
        } else {
          speech = 'HELP_NO_TOURNAMENT';
          attributes.temp.speechParams.Amount = bankroll;
        }

        if (!attributes.temp.tournamentAvailable) {
          return utils.getLocalTournamentTime(handlerInput).then((result) => {
            if (result) {
              speech = 'HELP_UPCOMING_TOURNAMENT';
              attributes.temp.speechParams.Time = result.time;
              attributes.temp.speechParams.Timezone = result.timezone;
              attributes.temp.speechParams.Coins = utils.TOURNAMENT_PAYOUT;
            }

            return handlerInput.jrb
              .speak(ri(speech, attributes.temp.speechParams))
              .reprompt(ri('HELP_REPROMPT'))
              .withSimpleCard(ri('HELP_CARD_TITLE'), ri('HELP_CARD_PAYOUT_TABLE', cardParams))
              .getResponse();
          });
        } else {
          return handlerInput.jrb
            .speak(ri(speech, attributes.temp.speechParams))
            .reprompt(ri('HELP_REPROMPT'))
            .withSimpleCard(ri('HELP_CARD_TITLE'), ri('HELP_CARD_PAYOUT_TABLE', cardParams))
            .getResponse();
        }
      }
    });
  },
};
