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

    // Read the available games then prompt for each one
    attributes.temp.readingRules = false;
    return utils.readAvailableGames(handlerInput, false)
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

      const game = (upsellProduct) ? upsellProduct : attributes.choices[0];
      return handlerInput.jrm.render(ri('GAME_LIST_' + game.toUpperCase()));
    }).then((gameName) => {
      if (upsellProduct) {
        attributes.prompts[upsellProduct] = now;
        attributes.temp.speechParams.Game = gameName;
        return handlerInput.jrm.render(ri('SELECT_UPSELL', attributes.temp.speechParams)).then((upsellMessage) => {
          const directive = {
            'type': 'Connections.SendRequest',
            'name': 'Upsell',
            'payload': {
              'InSkillProduct': {
                productId: attributes.paid[upsellProduct].productId,
              },
              'upsellMessage': upsellMessage,
            },
            'token': 'machine.' + upsellProduct + '.select',
          };

          // Need a way to get variation selected from Jargon
          if (upsellMessage.substring(0, 3) === 'We ') {
            attributes.upsellSelection = 'v1';
          } else if (upsellMessage.substring(0, 3) === 'We\'') {
            attributes.upsellSelection = 'v2';
          } else {
            attributes.upsellSelection = 'v3';
          }

          return handlerInput.jrb.addDirective(directive)
            .withShouldEndSession(true)
            .getResponse();
        });
      } else {
        // Ask for the first one
        attributes.temp.repromptParams.Game = gameName;
        Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);

        return handlerInput.jrb
          .speak(ri('SELECT_PICK_GAME', attributes.temp.speechParams))
          .reprompt(ri('SELECT_PICK_GAME_REPROMPT', attributes.temp.repromptParams))
          .getResponse();
      }
    });
  },
};
