//
// Handles selecting a game
//

'use strict';

const utils = require('../utils');
const seedrandom = require('seedrandom');

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
    if (availableGames.availableProducts.length && !attributes.temp.noUpsellGame) {
      // Pick one of the available games at random
      let seed = event.session.user.userId;
      if (attributes.currentGame && attributes[attributes.currentGame]
        && attributes[attributes.currentGame].timestamp) {
        seed += attributes[attributes.currentGame].timestamp;
      }
      const product = availableGames.availableProducts[
        Math.floor(seedrandom(seed)() * availableGames.availableProducts.length)];
      return handlerInput.responseBuilder
        .addDirective(utils.getPurchaseDirective(attributes, product, 'Upsell',
          'machine.' + product + '.select', res.strings.SELECT_UPSELL))
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
