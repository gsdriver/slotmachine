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
    let response;

    return new Promise((resolve, reject) => {
      new Promise((resolve, reject) => {
        // If this was fallback intent, let them know we didn't understand first
        if (event.request.intent.name === 'AMAZON.FallbackIntent') {
          handlerInput.jrm.render(ri('HELP_FALLBACK')).then(resolve);
        } else {
          resolve('');
        }
      })
      .then((text) => {
        attributes.temp.speechParams.FallbackText = text;
        attributes.temp.readingRules = false;
        if (attributes.choices && (attributes.choices.length > 0)) {
          // If selecting a game, help string is different
          attributes.temp.repromptParams.Game = utils.sayGame(event, attributes.choices[0]);
          Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);

          response = handlerInput.jrb
            .speak(ri('HELP_SELECT_TEXT', attributes.temp.speechParams))
            .reprompt(ri('LAUNCH_REPROMPT', attributes.temp.repromptParams))
            .getResponse();
          resolve(response);
        } else {
          const cardParams = {PayoutTable: utils.readPayoutTable(event, rules)};

          if (attributes.currentGame == 'tournament') {
            // Give some details about the tournament
            speech = 'HELP_IN_TOURNAMENT';
            attributes.temp.speechParams.Time = utils.getRemainingTournamentTime(handlerInput);
            attributes.temp.speechParams.Coins = utils.TOURNAMENT_PAYOUT;
            attributes.temp.speechParams.Amount = bankroll;
          } else {
            speech = 'HELP_NO_TOURNAMENT';
            attributes.temp.speechParams.Amount = bankroll;
          }

          if (!attributes.temp.tournamentAvailable) {
            utils.getLocalTournamentTime(handlerInput, (tournamentTime, timezone) => {
              if (tournamentTime) {
                speech = 'HELP_UPCOMING_TOURNAMENT';
                attributes.temp.speechParams.Time = tournamentTime;
                attributes.temp.speechParams.Timezone = timezone;
                attributes.temp.speechParams.Coins = utils.TOURNAMENT_PAYOUT;
              }

              response = handlerInput.jrb
                .speak(ri(speech, attributes.temp.speechParams))
                .reprompt(ri('HELP_REPROMPT'))
                .withSimpleCard(ri('HELP_CARD_TITLE'), ri('HELP_CARD_PAYOUT_TABLE', cardParams))
                .getResponse();
              resolve(response);
            });
          } else {
            response = handlerInput.jrb
              .speak(ri(speech, attributes.temp.speechParams))
              .reprompt(ri('HELP_REPROMPT'))
              .withSimpleCard(ri('HELP_CARD_TITLE'), ri('HELP_CARD_PAYOUT_TABLE', cardParams))
              .getResponse();
            response(response);
          }
        }
      });
    });
  },
};
