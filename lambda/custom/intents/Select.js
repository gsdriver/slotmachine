//
// Handles selecting a game
//

'use strict';

const utils = require('../utils');
const ri = require('@jargon/alexa-skill-sdk').ri;

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    return ((request.type === 'IntentRequest') && (request.intent.name === 'SelectIntent')
      && (!attributes.choices || !attributes.choices.length));
  },
  handle: function(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const now = Date.now();
    let upsellProduct;
    let response;

    return new Promise((resolve, reject) => {
      // Read the available games then prompt for each one
      attributes.temp.readingRules = false;
      utils.readAvailableGames(handlerInput, false)
      .then((availableGames) => {
        attributes.temp.speechParams.AvailableGames = availableGames.speech;
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
          attributes.temp.speechParams.Game = attributes.temp.gameList[upsellProduct];
          handlerInput.jrm.renderObject(ri('SELECT_UPSELL', attributes.temp.speechParams)).then((directive) => {
            directive.payload.InSkillProduct.productId = attributes.paid[upsellProduct].productId;
            directive.token = 'machine.' + upsellProduct + '.select';
            response = handlerInput.jrb.addDirective(directive)
              .withShouldEndSession(true)
              .getResponse();
            resolve(response);
          });
        } else {
          // Ask for the first one
          attributes.temp.repromptParams.Game = attributes.temp.gameList[attributes.choices[0]];
          Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);

          response = handlerInput.jrb
            .speak(ri('SELECT_PICK_GAME', attributes.temp.speechParams))
            .reprompt(ri('SELECT_PICK_GAME_REPROMPT', attributes.temp.repromptParams))
            .getResponse();
          resolve(response);
        }
      });
    });
  },
};
