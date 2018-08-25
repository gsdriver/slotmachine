//
// Handles stop, which will exit the skill
//

'use strict';

const utils = require('../utils');

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
    const res = require('../resources')(event.request.locale);
    const bankroll = utils.getBankroll(attributes);
    const rules = utils.getGame(attributes.currentGame);
    let speech = '';

    // If this was fallback intent, let them know we didn't understand first
    if (event.request.intent.name === 'AMAZON.FallbackIntent') {
      speech += res.strings.HELP_FALLBACK;
    }
    attributes.temp.readingRules = false;
    if (attributes.choices && (attributes.choices.length > 0)) {
      // If selecting a game, help string is different
      const reprompt = res.strings.LAUNCH_REPROMPT
        .replace('{0}', utils.sayGame(event, attributes.choices[0]));

      speech += res.strings.HELP_SELECT_TEXT;
      speech += reprompt;
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(reprompt)
        .getResponse();
    } else {
      const reprompt = res.strings.HELP_REPROMPT;

      if (attributes.currentGame == 'tournament') {
        // Give some details about the tournament
        speech += res.strings.HELP_TOURNAMENT
          .replace('{0}', utils.getRemainingTournamentTime(event))
          .replace('{1}', utils.TOURNAMENT_PAYOUT);
        speech += res.strings.READ_BANKROLL.replace('{0}', utils.readCoins(event, bankroll));
        speech += res.strings.HELP_COMMANDS;
      } else {
        speech += res.strings.READ_BANKROLL.replace('{0}', utils.readCoins(event, bankroll));
        speech += res.strings.HELP_COMMANDS;
      }


      if (!attributes.temp.tournamentAvailable) {
        return new Promise((resolve, reject) => {
          utils.getLocalTournamentTime(event, (tournamentTime) => {
            if (tournamentTime) {
              speech += res.strings.HELP_TOURNAMENT
                .replace('{0}', tournamentTime)
                .replace('{1}', utils.TOURNAMENT_PAYOUT);
            }
            speech += reprompt;

            const response = handlerInput.responseBuilder
              .speak(speech)
              .reprompt(reprompt)
              .withSimpleCard(res.strings.HELP_CARD_TITLE, utils.readPayoutTable(event, rules))
              .getResponse();
            resolve(response);
          });
        });
      } else {
        speech += reprompt;
        return handlerInput.responseBuilder
          .speak(speech)
          .reprompt(reprompt)
          .withSimpleCard(res.strings.HELP_CARD_TITLE, utils.readPayoutTable(event, rules))
          .getResponse();
      }
    }
  },
};
