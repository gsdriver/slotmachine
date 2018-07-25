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

    // First read leader board based on achievements
    attributes.temp.readingRules = false;
    return new Promise((resolve, reject) => {
      utils.readLeaderBoard(event.session.user.userId,
        'achievement',
        attributes, (err, highScores) => {
          if (err) {
            complete();
          } else if (!attributes.choices || !attributes.choices.length) {
            // Let's also get game bankroll
            utils.readLeaderBoard(event.session.user.userId,
              attributes.currentGame,
              attributes, (err, gameScores) => {
                complete(highScores, gameScores);
            });
          } else {
            complete(highScores);
          }
          resolve();
      });
    });

    function complete(highScores, gameScores) {
      let speech = '';
      let reprompt;

      if (gameScores && gameScores.top && attributes.currentGame == 'tournament') {
        // Only read the game scores
        if (gameScores.rank) {
          speech += res.strings.LEADER_GAME_RANKING
             .replace('{0}', gameScores.score)
             .replace('{1}', utils.sayGame(event, attributes.currentGame))
             .replace('{2}', gameScores.rank)
             .replace('{3}', gameScores.count);
        }

        // And what is the leader board for this game?
        const topScores = gameScores.top.map((x) => res.strings.LEADER_GAME_FORMAT.replace('{0}', x));
        speech += res.strings.LEADER_TOP_SCORES
            .replace('{0}', topScores.length)
            .replace('{1}', speechUtils.and(topScores, {locale: event.request.locale, pause: '300ms'}));
      } else if (!highScores) {
        speech = res.strings.LEADER_NO_SCORES;
      } else {
        if (!highScores.count || !highScores.top) {
          // Something went wrong
          speech = res.strings.LEADER_NO_SCORES;
        } else {
          if (highScores.rank) {
            speech += res.strings.LEADER_RANKING
               .replace('{0}', highScores.score)
               .replace('{1}', highScores.rank)
               .replace('{2}', highScores.count);
          }

          // And what is the leader board?
          const topScores = highScores.top.map((x) => res.strings.LEADER_FORMAT.replace('{0}', x));
          speech += res.strings.LEADER_TOP_SCORES
              .replace('{0}', topScores.length)
              .replace('{1}', speechUtils.and(topScores, {locale: event.request.locale, pause: '300ms'}));

          if (gameScores && gameScores.top) {
            if (gameScores.rank) {
              speech += res.strings.LEADER_GAME_RANKING
                 .replace('{0}', gameScores.score)
                 .replace('{1}', utils.sayGame(event, attributes.currentGame))
                 .replace('{2}', gameScores.rank)
                 .replace('{3}', gameScores.count);
            }

            // And what is the leader board for this game?
            const topScores = gameScores.top.map((x) => res.strings.LEADER_GAME_FORMAT.replace('{0}', x));
            speech += res.strings.LEADER_TOP_SCORES
                .replace('{0}', topScores.length)
                .replace('{1}', speechUtils.and(topScores, {locale: event.request.locale, pause: '300ms'}));
          }
        }
      }

      if (attributes.choices && (attributes.choices.length > 0)) {
        // Ask for the first one
        reprompt = res.strings.LAUNCH_REPROMPT
            .replace('{0}', utils.sayGame(event, attributes.choices[0]));
      } else {
        reprompt = res.strings.HIGHSCORE_REPROMPT;
      }
      speech += reprompt;

      handlerInput.responseBuilder
        .speak(speech)
        .reprompt(reprompt);
    }
  },
};
