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

    // Get the appropriate leader board for this game
    attributes.temp.readingRules = false;
    return new Promise((resolve, reject) => {
      utils.readLeaderBoard(event.session.user.userId, attributes.currentGame,
        attributes, (err, highScores) => {
        let speech;
        let reprompt;
        const game = attributes[attributes.currentGame];

        if (!highScores) {
          speech = 'HIGHSCORE_NO_SCORES';
        } else {
          if (!highScores.count || !highScores.top) {
            // Something went wrong
            speech = 'HIGHSCORE_NO_SCORES';
          } else {
            if (highScores.rank) {
              speech = (game.bankroll === undefined)
                ? 'HIGHSCORE_RANKING' : 'HIGHSCORE_GAME_RANKING';
              attributes.temp.speechParams.Coins = highScores.score;
              attributes.temp.speechParams.Rank = highScores.rank;
              attributes.temp.speechParams.Players = highScores.count;
              attributes.temp.speechParams.CurrentGame =
                attributes.temp.gameList[attributes.currentGame];
            }

            // And what is the leader board?
            let i;
            for (i = 0; i < 5; i++) {
              attributes.temp.speechParams['HighScore' + (i + 1)] = (highScores.top.length > i)
                ? highScores.top[i] : 0;
            }
            attributes.temp.speechParams.NumberOfLeaders = highScores.top.length;
          }
        }

        if (attributes.choices && (attributes.choices.length > 0)) {
          // Ask for the first one
          speech += '_SELECT';
          reprompt = 'LAUNCH_REPROMPT';
          attributes.temp.repromptParams.Game = attributes.temp.gameList[attributes.choices[0]];
          Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);
        } else {
          reprompt = 'HIGHSCORE_REPROMPT';
        }

        const response = handlerInput.jrb
          .speak(ri(speech, attributes.temp.speechParams))
          .reprompt(ri(reprompt, attributes.temp.repromptParams))
          .getResponse();
        resolve(response);
      });
    });
  },
};
