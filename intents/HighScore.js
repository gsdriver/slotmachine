//
// Reads the top high scores
//

'use strict';

const utils = require('../utils');
const speechUtils = require('alexa-speech-utils')();

module.exports = {
  handleIntent: function() {
    // First read leader board based on achievements
    utils.readLeaderBoard(this.event.session.user.userId,
      'achievement',
      this.attributes, (err, highScores) => {
        if (err) {
          complete(this);
        } else if (this.handler.state === 'INGAME') {
          // Let's also get game bankroll
          utils.readLeaderBoard(this.event.session.user.userId,
            this.attributes.currentGame,
            this.attributes, (err, gameScores) => {
              complete(this, highScores, gameScores);
          });
        } else {
          complete(this, highScores);
        }
    });

    function complete(context, highScores, gameScores) {
      const res = require('../' + context.event.request.locale + '/resources');
      let speech = '';
      let reprompt;

      if (!highScores) {
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
              .replace('{1}', speechUtils.and(topScores, {locale: context.event.request.locale, pause: '300ms'}));

          if (gameScores) {
            if (gameScores.rank) {
              speech += res.strings.LEADER_GAME_RANKING
                 .replace('{0}', gameScores.score)
                 .replace('{1}', res.sayGame(context.attributes.currentGame))
                 .replace('{2}', gameScores.rank)
                 .replace('{3}', gameScores.count);
            }

            // And what is the leader board for this game?
            const topScores = gameScores.top.map((x) => res.strings.LEADER_GAME_FORMAT.replace('{0}', x));
            speech += res.strings.LEADER_TOP_SCORES
                .replace('{0}', topScores.length)
                .replace('{1}', speechUtils.and(topScores, {locale: context.event.request.locale, pause: '300ms'}));
          }
        }
      }

      if ((context.handler.state === 'SELECTGAME') && context.attributes.choices) {
        // Ask for the first one
        reprompt = res.strings.LAUNCH_REPROMPT.replace('{0}', res.sayGame(context.attributes.choices[0]));
      } else {
        reprompt = res.strings.HIGHSCORE_REPROMPT;
      }
      speech += reprompt;

      utils.emitResponse(context.emit, context.event.request.locale, null,
          null, speech, reprompt);
    }
  },
};
