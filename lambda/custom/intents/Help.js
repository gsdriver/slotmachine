//
// Handles stop, which will exit the skill
//

'use strict';

const utils = require('../utils');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return ((request.type === 'IntentRequest') && (request.intent.name === 'AMAZON.HelpIntent'));
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);
    const game = attributes[attributes.currentGame];
    const rules = utils.getGame(attributes.currentGame);
    let speech;

    attributes.temp.readingRules = false;
    if (attributes.choices && (attributes.choices.length > 0)) {
      // If selecting a game, help string is different
      const reprompt = res.strings.LAUNCH_REPROMPT
        .replace('{0}', utils.sayGame(event, attributes.choices[0]));

      speech = res.strings.HELP_SELECT_TEXT;
      speech += reprompt;
      handlerInput.responseBuilder
        .speak(speech)
        .reprompt(reprompt);
    } else {
      const reprompt = res.strings.HELP_REPROMPT;

      if (attributes.currentGame == 'tournament') {
        // Give some details about the tournament
        speech = res.strings.HELP_TOURNAMENT.replace('{0}', utils.getRemainingTournamentTime(event));
        speech += res.strings.READ_BANKROLL.replace('{0}', utils.readCoins(event, game.bankroll));
        speech += res.strings.HELP_COMMANDS;
      } else {
        speech = res.strings.READ_BANKROLL.replace('{0}', utils.readCoins(event, game.bankroll));
        speech += res.strings.HELP_COMMANDS;
        speech = res.strings.HELP_ACHIEVEMENT_POINTS + speech;
      }
      speech += reprompt;

      handlerInput.responseBuilder
        .speak(speech)
        .reprompt(reprompt)
        .withSimpleCard(res.strings.HELP_CARD_TITLE,
          res.strings.HELP_ACHIEVEMENT_CARD_TEXT + utils.readPayoutTable(event, rules));
    }
  },
};