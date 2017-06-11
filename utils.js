//
// Utility functions
//

'use strict';

const speechUtils = require('alexa-speech-utils')();

const games = {
  // Has 99.5% payout
  'basic': {
    'maxCoins': 5,
    'slots': 3,
    'symbols': ['cherry', 'lemon', 'orange', 'plum', 'bar'],
    'frequency': [
      {'total': 30, 'symbols': [6, 5, 8, 10, 1]},
      {'total': 23, 'symbols': [4, 8, 4, 5, 2]},
      {'total': 38, 'symbols': [15, 8, 6, 1, 8]},
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
  readCoins: function(locale, coins) {
    const res = require('./' + locale + '/resources');
    return speechUtils.numberOfItems(coins, res.strings.SINGLE_COIN, res.strings.PLURAL_COIN);
  },
  readPayout: function(locale, game, payout) {
    const res = require('./' + locale + '/resources');
    const slots = payout.split('|');
    let text = '';
    let i;

    for (i = 0; i < slots.length; i++) {
      text += res.saySymbol(slots[i]);
      if (i < game.slots - 1) {
        text += ' ';
      }
    }

    for (i = slots.length; i < game.slots; i++) {
      text += res.strings.ANY_SLOT;
      if (i < game.slots - 1) {
        text += ' ';
      }
    }

    return text;
  },
};
