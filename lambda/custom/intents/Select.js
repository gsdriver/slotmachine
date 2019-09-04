//
// Handles selecting a game
//

'use strict';

const utils = require('../utils');
const upsell = require('../UpsellEngine');
const ri = require('@jargon/alexa-skill-sdk').ri;
const SelectYes = require('./SelectYes');
const Purchase = require('./Purchase');

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    if ((request.type === 'IntentRequest') && (request.intent.name === 'SelectIntent')) {
      if (request.intent.slots && request.intent.slots.Machine) {
        return true;
      }

      return (!attributes.choices || !attributes.choices.length);
    }

    return false;
  },
  handle: function(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();

    // If they specified a machine name, switch to it if they can purchase it
    const product = utils.mapProduct(handlerInput);
    if (product) {
      return utils.readAvailableGames(handlerInput, false)
      .then((availableGames) => {
        let choice = availableGames.choices.indexOf(product);
        if (choice > -1) {
          attributes.choices = [product];
          return SelectYes.handle(handlerInput);
        } else {
          // This game isn't available to them
          choice = availableGames.availableProducts.indexOf(product);
          if (choice > -1) {
            // But they can buy it - treat as a purchase
            return Purchase.handle(handlerInput);
          } else {
            // Hmm - this shouldn't happen
            console.log('ERROR: Select non-existing machine name ' + product);
            return handlerInput.jrb
              .speak(ri('Jargon.unhandledResponse'))
              .reprompt(ri('Jargon.defaultReprompt'))
              .getResponse();
          }
        }
      });
    }

    if (!attributes.temp.noUpsell) {
      const directive = upsell.getUpsell(handlerInput, 'select');
      if (directive) {
        directive.token = 'machine.' + directive.token + '.select';
        return handlerInput.responseBuilder
          .addDirective(directive)
          .withShouldEndSession(true)
          .getResponse();
      }
    }

    // Read the available games then prompt for each one
    attributes.temp.readingRules = false;
    return utils.readAvailableGames(handlerInput, false)
    .then((availableGames) => {
      attributes.temp.speechParams.AvailableGames = availableGames.speech;
      attributes.choices = availableGames.choices;
      attributes.originalChoices = availableGames.choices;

      const game = attributes.choices[0];
      return handlerInput.jrm.render(ri('GAME_LIST_' + game.toUpperCase()));
    }).then((gameName) => {
      // Ask for the first one
      attributes.temp.repromptParams.Game = gameName;
      Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);

      return handlerInput.jrb
        .speak(ri('SELECT_PICK_GAME', attributes.temp.speechParams))
        .reprompt(ri('SELECT_PICK_GAME_REPROMPT', attributes.temp.repromptParams))
        .getResponse();
    });
  },
};
