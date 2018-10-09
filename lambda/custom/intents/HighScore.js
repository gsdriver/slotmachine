//
// Reads the top high scores
//

'use strict';

const utils = require('../utils');
const ri = require('@jargon/alexa-skill-sdk').ri;

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return ((request.type === 'IntentRequest') && (request.intent.name === 'HighScoreIntent'));
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    let speech;

    // Get the appropriate leader board for this game
    attributes.temp.readingRules = false;
    return utils.readLeaderBoard(event.session.user.userId, attributes.currentGame, attributes)
    .then((highScores) => {
      const game = attributes[attributes.currentGame];

      if (!highScores) {
        speech = 'HIGHSCORE_NO_SCORES';
        return;
      } else {
        if (!highScores.count || !highScores.top) {
          // Something went wrong
          speech = 'HIGHSCORE_NO_SCORES';
          return;
        } else {
          // And what is the leader board?
          let i;
          for (i = 0; i < 5; i++) {
            attributes.temp.speechParams['HighScore' + (i + 1)] = (highScores.top.length > i)
              ? highScores.top[i] : 0;
          }
          attributes.temp.speechParams.NumberOfLeaders = highScores.top.length;

          if (highScores.rank) {
            speech = (game.bankroll === undefined)
              ? 'HIGHSCORE_RANKING' : 'HIGHSCORE_GAME_RANKING';
            attributes.temp.speechParams.Coins = highScores.score;
            attributes.temp.speechParams.Rank = highScores.rank;
            attributes.temp.speechParams.Players = highScores.count;
            return handlerInput.jrm.render(ri('GAME_LIST_' + attributes.currentGame.toUpperCase()));
          } else {
            return;
          }
        }
      }
    }).then((gameName) => {
      if (gameName) {
        attributes.temp.speechParams.CurrentGame = gameName;
      }

      if (attributes.choices && (attributes.choices.length > 0)) {
        // Ask for the first one
        speech += '_SELECT';
        return handlerInput.jrm.render(ri('GAME_LIST_' + attributes.choices[0].toUpperCase()))
        .then((gameName) => {
          attributes.temp.repromptParams.Game = gameName;
          Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);
          return handlerInput.jrb
            .speak(ri(speech, attributes.temp.speechParams))
            .reprompt(ri('LAUNCH_REPROMPT', attributes.temp.repromptParams))
            .getResponse();
        });
      } else {
        return handlerInput.jrb
          .speak(ri(speech, attributes.temp.speechParams))
          .reprompt(ri('HIGHSCORE_REPROMPT'))
          .getResponse();
      }
    });
  },
};
