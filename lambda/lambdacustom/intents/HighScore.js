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

    // Do we have their name?
    attributes.temp.readingRules = false;
    return utils.getUserName(handlerInput).then((name) => {
      attributes.temp.speechParams.Name = '';
      if (name === false) {
        // Let them know they can provide a name
        handlerInput.jrb.speak(ri('HIGHSCORE_GIVENAME'), true)
          .withAskForPermissionsConsentCard(['alexa::profile:given_name:read']);
      } else if (name) {
        attributes.temp.speechParams.Name = name + '<break time="200ms"/>';
      }

      // Get name of game
      return handlerInput.jrm.render(ri('GAME_LIST_' + attributes.currentGame.toUpperCase()));
    }).then((gameName) => {
      // Get the appropriate leader board for this game
      attributes.temp.speechParams.CurrentGame = gameName;
      return utils.readLeaderBoard(event.session.user.userId, attributes.currentGame, attributes);
    }).then((highScores) => {
      const game = attributes[attributes.currentGame];

      if (!highScores) {
        handlerInput.jrb.speak(ri('HIGHSCORE_NO_SCORES'), true);
        return;
      } else {
        if (!highScores.count || !highScores.top) {
          // Something went wrong
          handlerInput.jrb.speak(ri('HIGHSCORE_NO_SCORES'), true);
          return;
        } else {
          // Where do you rank?
          if (highScores.rank) {
            speech = (game.bankroll === undefined)
              ? 'HIGHSCORE_PEAK_RANKING' : 'HIGHSCORE_GAME_RANKING';
            attributes.temp.speechParams.Coins = highScores.score;
            attributes.temp.speechParams.Rank = highScores.rank;
            attributes.temp.speechParams.Players = highScores.count;
            handlerInput.jrb.speak(ri(speech, attributes.temp.speechParams), true);
          }

          // And what is the leader board?
          attributes.temp.speechParams.NumberOfLeaders = highScores.top.length;
          handlerInput.jrb.speak(ri('HIGHSCORE_LEADERS', attributes.temp.speechParams), true);
          let i;
          for (i = 0; i < 5; i++) {
            if (highScores.top.length > i) {
              const speechParams = {};
              speechParams.HighScore = highScores.top[i].score;
              if (highScores.top[i].name) {
                speechParams.Name = highScores.top[i].name;
                handlerInput.jrb.speak(ri('HIGHSCORE_LEADER_WITHNAME', speechParams), true);
              } else {
                handlerInput.jrb.speak(ri('HIGHSCORE_LEADER_NONAME', speechParams), true);
              }
            }
          }

          return;
        }
      }
    }).then((gameName) => {
      if (attributes.choices && (attributes.choices.length > 0)) {
        // Ask for the first one
        return handlerInput.jrm.render(ri('GAME_LIST_' + attributes.choices[0].toUpperCase()))
        .then((gameName) => {
          attributes.temp.repromptParams.Game = gameName;
          Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);
          return handlerInput.jrb
            .speak(ri('HIGHSCORE_SELECT', attributes.temp.speechParams), true)
            .reprompt(ri('HIGHSCORE_SELECT', attributes.temp.repromptParams))
            .getResponse();
        });
      } else {
        return handlerInput.jrb
          .speak(ri('HIGHSCORE_REPROMPT'), true)
          .reprompt(ri('HIGHSCORE_REPROMPT'))
          .getResponse();
      }
    });
  },
};
