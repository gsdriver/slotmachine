//
// Handles selecting a game
//

'use strict';

const utils = require('../utils');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return ((request.type === 'IntentRequest') && (request.intent.name === 'SelectIntent')
      && (!attributes.choices || !attributes.choices.length));
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);

    // Tell them the rules, their bankroll and offer a few things they can do
    let speech;

    // Read the available games then prompt for each one
    attributes.temp.readingRules = false;
    const availableGames = utils.readAvailableGames(event, attributes, false);
    speech = availableGames.speech;
    attributes.choices = availableGames.choices;
    attributes.originalChoices = availableGames.choices;
    if (availableGames.forPurchase.length && !attributes.temp.noUpsellGame) {
      return handlerInput.responseBuilder
        .addDirective(utils.getPurchaseDirective(attributes, 'crazydiamond', 'Upsell',
          'machine.crazydiamond.select', res.strings.SELECT_UPSELL))
        .withShouldEndSession(true)
        .getResponse();
    } else {
      // Ask for the first one
      const reprompt = res.strings.LAUNCH_REPROMPT
          .replace('{0}', utils.sayGame(event, availableGames.choices[0]));
      speech += reprompt;
      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt(reprompt)
        .getResponse();
    }
  },
};
