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
      {'total': 35, 'symbols': [6, 8, 8, 10, 2]},
      {'total': 26, 'symbols': [4, 8, 4, 6, 4]},
      {'total': 43, 'symbols': [24, 10, 6, 2, 1]},
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
  // % payout, no lower payouts but higher opportunity for jackpots
  'wild': {
    'maxCoins': 5,
    'slots': 3,
    'symbols': ['cherry', 'blank', 'bar', 'double bar', 'seven'],
    'frequency': [
      {'total': 39, 'symbols': [3, 16, 10, 4, 6]},
      {'total': 26, 'symbols': [2, 16, 5, 2, 1]},
      {'total': 34, 'symbols': [1, 20, 8, 4, 1]},
    ],
    'substitutes': {
      'bar': ['any bar'],
      'double bar': ['any bar'],
      'cherry': ['bar', 'double bar', 'seven'],
    },
    'wild': ['cherry'],
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
  readAvailableGames: function(locale, callback) {
    const res = require('./' + locale + '/resources');
    let speech;
    const choices = [];
    const choiceText = [];
    let game;
    let count = 0;

    for (game in games) {
      if (game) {
        count++;
        choices.push(game);
        choiceText.push(res.sayGame(game));
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
  readWildSymbols: function(locale, game) {
    const res = require('./' + locale + '/resources');
    let i;
    let text = '';

    for (i = 0; i < (game.wild ? game.wild.length : 0); i++) {
      text += res.strings.WILD_SYMBOL.replace('{0}', res.saySymbol(game.wild[i]));
    }

    return text;
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
        text += readPayoutInternal(locale, game, payout, ' ');
        text += res.strings.PAYOUT_PAYS.replace('{0}', game.payouts[payout]);
        text += '\n';
      }
    }

    return text;
  },
  readRank: function(locale, game, callback) {
    const res = require('./' + locale + '/resources');

    getRankFromS3(game.high, (err, rank) => {
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

function getRankFromS3(high, callback) {
  let higher;

  // Read the S3 buckets that has everyone's scores
  s3.getObject({Bucket: 'garrett-alexa-usage', Key: 'SlotMachineScores.txt'}, (err, data) => {
    if (err) {
      console.log(err, err.stack);
      callback(err, null);
    } else {
      // Yeah, I can do a binary search (this is sorted), but straight search for now
      const ranking = JSON.parse(data.Body.toString('ascii'));
      const scores = ranking.scores;

      if (scores) {
        for (higher = 0; higher < scores.length; higher++) {
          if (scores[higher] <= high) {
            break;
          }
        }

        // Also let them know how much it takes to move up a position
        callback(null, {rank: (higher + 1),
            delta: (higher > 0) ? (scores[higher - 1] - high) : 0,
            players: scores.length});
      } else {
        console.log('No scoreset for ' + scoreSet);
        callback('No scoreset', null);
      }
    }
  });
}
