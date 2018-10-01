//
// Reads the top high scores
//

'use strict';

const utils = require('../utils');
const speechUtils = require('alexa-speech-utils')();

module.exports = {
  canHandle: function(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return ((request.type === 'IntentRequest') && (request.intent.name === 'HighScoreIntent'));
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);

    // Get the appropriate leader board for this game
    attributes.temp.readingRules = false;
    return new Promise((resolve, reject) => {
      utils.readLeaderBoard(event.session.user.userId, attributes.currentGame,
        attributes, (err, highScores) => {
        let speech = '';
        let reprompt;
        const game = attributes[attributes.currentGame];

        if (!highScores) {
          speech = res.strings.LEADER_NO_SCORES;
        } else {
          if (!highScores.count || !highScores.top) {
            // Something went wrong
            speech = res.strings.LEADER_NO_SCORES;
          } else {
            if (highScores.rank) {
              const format = (game.bankroll === undefined)
                ? res.strings.LEADER_RANKING
                : res.strings.LEADER_GAME_RANKING;
              speech += format
                 .replace('{Coins}', highScores.score)
                 .replace('{Rank}', highScores.rank)
                 .replace('{Players}', highScores.count)
                 .replace('{Game}', utils.sayGame(event, attributes.currentGame));
            }

            // And what is the leader board?
            const topScores = highScores.top.map((x) => res.strings.LEADER_FORMAT.replace('{Coins}', x));
            speech += res.strings.LEADER_TOP_SCORES
                .replace('{NumberOfLeaders}', topScores.length)
                .replace('{Bankrolls}', speechUtils.and(topScores, {locale: event.request.locale, pause: '300ms'}));
          }
        }

        if (attributes.choices && (attributes.choices.length > 0)) {
          // Ask for the first one
          reprompt = res.strings.LAUNCH_REPROMPT
              .replace('{Game}', utils.sayGame(event, attributes.choices[0]));
        } else {
          reprompt = res.strings.HIGHSCORE_REPROMPT;
        }
        speech += reprompt;

        const response = handlerInput.responseBuilder
          .speak(speech)
          .reprompt(reprompt)
          .getResponse();
        resolve(response);
      });
    });
  },
};
