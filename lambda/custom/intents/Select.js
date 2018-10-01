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
    const now = Date.now();

    // Tell them the rules, their bankroll and offer a few things they can do
    let speech;
    let upsellProduct;

    // Read the available games then prompt for each one
    attributes.temp.readingRules = false;
    const availableGames = utils.readAvailableGames(event, attributes, false);
    speech = availableGames.speech;
    attributes.choices = availableGames.choices;
    attributes.originalChoices = availableGames.choices;
    if (availableGames.availableProducts.length && !attributes.temp.noUpsellGame) {
      // Go through and see if there is a machine we can offer as upsell
      // We only offer each machine once every two days
      // So as not to annoy our customers too much
      availableGames.availableProducts.forEach((product) => {
        if (!attributes.prompts[product] ||
          ((now - attributes.prompts[product]) > 2*24*60*60*1000)) {
            upsellProduct = product;
        }
      });
    }

    if (upsellProduct) {
      attributes.prompts[upsellProduct] = now;
      speech = res.strings.SELECT_UPSELL;
      attributes.temp.speechParams.Game = utils.sayGame(event, upsellProduct);
      return handlerInput.responseBuilder
        .addDirective(utils.getPurchaseDirective(attributes, upsellProduct, 'Upsell',
          'machine.' + upsellProduct + '.select', utils.ri(speech, attributes.temp.speechParams)))
        .withShouldEndSession(true)
        .getResponse();
    } else {
      // Ask for the first one
      const reprompt = res.strings.LAUNCH_REPROMPT;
      attributes.temp.repromptParams.Game = utils.sayGame(event, availableGames.choices[0]);
      speech += reprompt;
      Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);

      return handlerInput.responseBuilder
        .speak(utils.ri(speech, attributes.temp.speechParams))
        .reprompt(utils.ri(reprompt, attributes.temp.repromptParams))
        .getResponse();
    }
  },
};
