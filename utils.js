//
// Utility functions
//

'use strict';

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const speechUtils = require('alexa-speech-utils')();

const games = {
  // Has 99.8% payout
  'basic': {
    'maxCoins': 5,
    'slots': 3,
    'symbols': ['cherry', 'lemon', 'orange', 'plum', 'bar'],
    'frequency': [
      {'symbols': [6, 8, 8, 10, 2]},
      {'symbols': [4, 8, 4, 6, 4]},
      {'symbols': [24, 10, 6, 2, 1]},
    ],
    'payouts': {
      'cherry': 2,
      'cherry|cherry': 4,
      'lemon|lemon|lemon': 8,
      'orange|orange|orange': 10,
      'plum|plum|plum': 15,
      'bar': 5,
      'bar|bar': 10,
      'bar|bar|bar': 100,
    },
  },
  // 99.8% payout, no lower payouts but higher opportunity for jackpots
  'wild': {
    'maxCoins': 5,
    'slots': 3,
    'symbols': ['cherry', 'blank', 'bar', 'double bar', 'seven'],
    'frequency': [
      {'symbols': [3, 16, 10, 4, 6]},
      {'symbols': [2, 16, 5, 2, 1]},
      {'symbols': [1, 20, 8, 4, 1]},
    ],
    'substitutes': {
      'bar': ['any bar'],
      'double bar': ['any bar'],
      'cherry': ['bar', 'double bar', 'seven'],
    },
    'special': 'WILD_SPECIAL',
    'payouts': {
      'cherry': 5,
      'cherry|cherry': 10,
      'any bar|any bar|any bar': 5,
      'bar|bar|bar': 10,
      'double bar|double bar|double bar': 20,
      'seven|seven|seven': 50,
      'cherry|cherry|cherry': 500,
    },
  },
};

if (process.env.PROGRESSIVE) {
  games.progressive = {
    'maxCoins': 5,
    'slots': 3,
    'symbols': ['cherry', 'bell', 'orange', 'bar', 'diamond'],
    'frequency': [
      {'symbols': [6, 8, 8, 10, 2]},
      {'symbols': [4, 8, 4, 6, 2]},
      {'symbols': [22, 10, 6, 2, 1]},
    ],
    'progressive': {
      'start': 100,
      'rate': 0.05,
      'match': 'diamond|diamond|diamond',
    },
    'special': 'PROGRESSIVE_SPECIAL',
    'payouts': {
      'cherry': 2,
      'cherry|cherry': 4,
      'bell|bell|bell': 5,
      'orange|orange|orange': 10,
      'bar|bar|bar': 15,
      'diamond': 5,
      'diamond|diamond': 10,
      'diamond|diamond|diamond': 100,
    },
  };
}

module.exports = {
  emitResponse: function(emit, locale, error, response, speech, reprompt) {
    if (error) {
      const res = require('./' + locale + '/resources');
      console.log('Speech error: ' + error);
      emit(':ask', error, res.ERROR_REPROMPT);
    } else if (response) {
      emit(':tell', response);
    } else {
      emit(':ask', speech, reprompt);
    }
  },
  getGame: function(name) {
    return games[name];
  },
  readAvailableGames: function(locale, currentGame, callback) {
    const res = require('./' + locale + '/resources');
    let speech;
    const choices = [];
    const choiceText = [];
    let game;
    let count = 0;

    for (game in games) {
      if (game) {
        count++;
        // Put the last played game at the front of the list
        if (game == currentGame) {
          choices.unshift(game);
          choiceText.unshift(res.sayGame(game));
        } else {
         choices.push(game);
         choiceText.push(res.sayGame(game));
       }
      }
    }

    speech = res.strings.AVAILABLE_GAMES.replace('{0}', count);
    speech += speechUtils.and(choiceText, {locale: locale});
    speech += '. ';
    callback(speech, choices);
  },
  readCoins: function(locale, coins) {
    const res = require('./' + locale + '/resources');
    return speechUtils.numberOfItems(coins, res.strings.SINGLE_COIN, res.strings.PLURAL_COIN);
  },
  readPayout: function(locale, game, payout) {
    return readPayoutInternal(locale, game, payout, ' <break time=\"200ms\"/> ');
  },
  readPayoutTable: function(locale, game) {
    const res = require('./' + locale + '/resources');
    let text = '';
    let payout;
    let i;

    for (i = 0; i < (game.wild ? game.wild.length : 0); i++) {
      text += res.strings.WILD_SYMBOL.replace('{0}', res.saySymbol(game.wild[i]));
      text += '\n';
    }

    for (payout in game.payouts) {
      if (payout) {
        // Special case if it's the progressive
        text += readPayoutInternal(locale, game, payout, ' ');
        text += readPayoutAmountInternal(locale, game, payout);
        text += '\n';
      }
    }

    return text;
  },
  readPayoutAmount: function(locale, game, payout) {
    return readPayoutAmountInternal(locale, game, payout);
  },
  readRank: function(locale, attributes, callback) {
    const res = require('./' + locale + '/resources');
    const game = attributes[attributes.currentGame];

    getRankFromS3(attributes, (err, rank) => {
      // Let them know their current rank
      let speech = '';

      if (rank) {
        let togo = '';

        if (rank.delta > 0) {
          togo = res.strings.RANK_TOGO.replace('{0}', speechUtils.numberOfItems(rank.delta, res.strings.SINGLE_COIN, res.strings.PLURAL_COIN)).replace('{1}', rank.rank - 1);
        }

        // If they haven't played, just tell them the number of players
        if (game.spins > 0) {
          speech += res.strings.RANK_POSITION.replace('{0}', game.high).replace('{1}', rank.rank).replace('{2}', rank.players);
          speech += togo;
        } else {
          speech += res.strings.RANK_NUMPLAYERS.replace('{0}', rank.players);
        }
      }

      callback(err, speech);
    });
  },
};

function readPayoutInternal(locale, game, payout, pause) {
  const res = require('./' + locale + '/resources');
  const slots = payout.split('|');
  let text = '';
  let i;

  for (i = 0; i < slots.length; i++) {
    text += res.saySymbol(slots[i]);
    text += pause;
  }

  for (i = slots.length; i < game.slots; i++) {
    text += res.strings.ANY_SLOT;
    text += pause;
  }

  return text;
}

function readPayoutAmountInternal(locale, game, payout) {
  let text;
  const res = require('./' + locale + '/resources');

  if (game.progressive && (game.progressive.match === payout)) {
    text = res.strings.PAYOUT_PROGRESSIVE;
  } else {
    text = res.strings.PAYOUT_PAYS.replace('{0}', game.payouts[payout]);
  }

  return text;
}

function getRankFromS3(attributes, callback) {
  let higher;
  const game = attributes[attributes.currentGame];

  // Read the S3 buckets that has everyone's scores
  s3.getObject({Bucket: 'garrett-alexa-usage', Key: 'SlotMachineScores2.txt'}, (err, data) => {
    if (err) {
      console.log(err, err.stack);
      callback(err, null);
    } else {
      // Yeah, I can do a binary search (this is sorted), but straight search for now
      const ranking = JSON.parse(data.Body.toString('ascii'));
      const scores = ranking.scores;

      if (scores && scores[attributes.currentGame]) {
        const gameScores = scores[attributes.currentGame];

        for (higher = 0; higher < gameScores.length; higher++) {
          if (gameScores[higher] <= game.high) {
            break;
          }
        }

        // Also let them know how much it takes to move up a position
        callback(null, {rank: (higher + 1),
            delta: (higher > 0) ? (gameScores[higher - 1] - game.high) : 0,
            players: gameScores.length});
      } else {
        console.log('No scoreset for ' + attributes.currentGame);
        callback('No scoreset', null);
      }
    }
  });
}
