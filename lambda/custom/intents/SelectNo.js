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

    return ((request.type === 'IntentRequest')
      && (attributes.choices && (attributes.choices.length > 0))
      && ((request.intent.name === 'SelectIntent')
        || (request.intent.name === 'AMAZON.NextIntent')
        || (request.intent.name === 'AMAZON.NoIntent')));
  },
  handle: function(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    let speech;

    // OK, pop this choice and go to the next one - if no other choices, we'll go with the last one
    attributes.choices.shift();
    if (attributes.choices.length === 1) {
      // OK, we're going with this one
      // Just in case they were trying to play at the last minute...
      if (!attributes.temp.tournamentAvailable && (attributes.currentGame == 'tournament')) {
        attributes.currentGame = 'basic';
        return handlerInput.jrb
          .speak(ri('TOURNAMENT_ENDED'))
          .withShouldEndSession(true)
          .getResponse();
      }

      const game = attributes[attributes.currentGame];
      const rules = utils.getGame(attributes.currentGame);
      return utils.selectGame(handlerInput, 0).then(() => {
        attributes.temp.repromptParams.Coins = rules.maxCoins;

        speech = 'SELECT_WELCOME';
        attributes.temp.speechParams.Amount = utils.getBankroll(attributes);
        return handlerInput.jrm.render(ri('GAME_LIST_' + attributes.currentGame.toUpperCase()));
      }).then((gameName) => {
        attributes.temp.speechParams.Game = gameName;

        if (game.progressiveJackpot) {
          // For progressive, just tell them the jackpot and to bet max coins
          speech += '_PROGRESSIVE';
          attributes.temp.speechParams.Jackpot = game.progressiveJackpot;
          attributes.temp.speechParams.Coins = rules.maxCoins;
        } else {
          Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);
        }

        if (rules.welcome) {
          return handlerInput.jrm.render(ri(rules.welcome));
        } else {
          return '';
        }
      }).then((welcome) => {
        attributes.temp.speechParams.GameWelcome = welcome;
        return handlerInput.jrb
          .speak(ri(speech, attributes.temp.speechParams))
          .reprompt(ri('SELECT_REPROMPT', attributes.temp.repromptParams))
          .getResponse();
      });
    } else {
      return handlerInput.jrm.render(ri('GAME_LIST_' + attributes.choices[0].toUpperCase()))
      .then((gameName) => {
        attributes.temp.repromptParams.Game = gameName;
        Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);

        return handlerInput.jrb
          .speak(ri('LAUNCH_REPROMPT', attributes.temp.speechParams))
          .reprompt(ri('LAUNCH_REPROMPT', attributes.temp.repromptParams))
          .getResponse();
      });
    }
  },
};
