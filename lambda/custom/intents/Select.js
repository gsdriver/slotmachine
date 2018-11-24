//
// Handles selecting a game
//

'use strict';

const utils = require('../utils');
const upsell = require('../UpsellEngine');
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
