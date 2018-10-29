//
// Utility functions
//

'use strict';

const Alexa = require('ask-sdk');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const speechUtils = require('alexa-speech-utils')();
const request = require('request');
const querystring = require('querystring');
const moment = require('moment-timezone');
const leven = require('leven');
const ri = require('@jargon/alexa-skill-sdk').ri;

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
  'progressive': {
    'maxCoins': 5,
    'slots': 3,
    'symbols': ['cherry', 'bell', 'orange', 'bar', 'diamond'],
    'frequency': [
      {'symbols': [6, 8, 8, 10, 2]},
      {'symbols': [4, 8, 4, 6, 2]},
      {'symbols': [22, 10, 6, 2, 1]},
    ],
    'progressive': {
      'start': 500,
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
  },
  // Has 102% payout
  'crazydiamond': {
    'product': 'crazydiamond',
    'maxCoins': 5,
    'slots': 3,
    'symbols': ['cherry', 'watermelon', 'star', 'seven', 'diamond'],
    'frequency': [
      {'symbols': [6, 12, 12, 2, 1]},
      {'symbols': [8, 6, 3, 1, 2]},
      {'symbols': [12, 3, 3, 3, 4]},
    ],
    'substitutes': {
      'diamond': ['cherry', 'watermelon', 'star', 'seven'],
    },
    'special': 'DIAMOND_SPECIAL',
    'payouts': {
      'cherry|cherry': 2,
      'watermelon|watermelon|watermelon': 4,
      'star|star|star': 5,
      'seven|seven': 10,
      'seven|seven|seven': 20,
      'diamond': 10,
      'diamond|diamond': 25,
      'diamond|diamond|diamond': 200,
    },
  },
};

const tournaments = [
  // 110% payout, Batman theme
  {
    'maxCoins': 5,
    'slots': 3,
    'symbols': ['penguin', '2face', 'riddler', 'joker', 'batman'],
    'frequency': [
      {'symbols': [6, 8, 8, 12, 2]},
      {'symbols': [4, 6, 6, 6, 4]},
      {'symbols': [24, 6, 6, 2, 1]},
    ],
    'welcome': 'BATMAN_GAME',
    'payouts': {
      'penguin': 2,
      'penguin|penguin': 5,
      '2face|2face|2face': 10,
      'riddler|riddler|riddler': 12,
      'joker|joker|joker': 15,
      'batman': 5,
      'batman|batman': 25,
      'batman|batman|batman': 50,
    },
  },
  // 105% payout; high jackpot
  {
    'maxCoins': 5,
    'slots': 3,
    'symbols': ['cherry', 'plum', 'bell', 'bar', 'seven', 'diamond'],
    'frequency': [
      {'symbols': [5, 6, 5, 8, 4, 4]},
      {'symbols': [2, 15, 12, 4, 2, 1]},
      {'symbols': [1, 12, 8, 8, 4, 1]},
    ],
    'substitutes': {
      'cherry': ['bell', 'bar', 'seven', 'diamond'],
    },
    'special': 'WILD_SPECIAL',
    'welcome': 'HIGH_JACKPOT',
    'payouts': {
      'cherry': 2,
      'bell|bell|bell': 5,
      'bar|bar|bar': 10,
      'seven|seven|seven': 20,
      'diamond|diamond|diamond': 100,
      'cherry|cherry|cherry': 1000,
    },
  },
  // 110% payout, lower top jackpot
  {
    'maxCoins': 5,
    'slots': 3,
    'symbols': ['heart', 'bell', 'orange', 'bar', 'seven'],
    'frequency': [
      {'symbols': [6, 7, 7, 4, 3]},
      {'symbols': [8, 10, 5, 4, 2]},
      {'symbols': [2, 9, 8, 6, 4]},
    ],
    'welcome': 'HIGH_PAYOUT',
    'payouts': {
      'heart': 2,
      'heart|heart': 4,
      'bell|bell|bell': 5,
      'orange|orange|orange': 6,
      'bar|bar': 10,
      'bar|bar|bar': 25,
      'seven|seven|seven': 50,
    },
  },
  // 107% payout, 40% chance of win
  {
    'maxCoins': 5,
    'slots': 3,
    'symbols': ['chicken', 'turkey', 'pork', 'veal', 'steak'],
    'frequency': [
      {'symbols': [4, 4, 3, 2, 1]},
      {'symbols': [6, 8, 5, 4, 2]},
      {'symbols': [2, 9, 8, 6, 2]},
    ],
    'welcome': 'STANDARD_MEAT',
    'payouts': {
      'chicken': 1,
      'chicken|chicken': 2,
      'turkey|turkey|turkey': 4,
      'pork|pork|pork': 6,
      'veal|veal|veal': 8,
      'steak': 5,
      'steak|steak': 20,
      'steak|steak|steak': 100,
    },
  },
  // 107% payout, every spin wins!
  {
    'maxCoins': 5,
    'slots': 3,
    'symbols': ['cherry', 'heart', 'orange', 'gold bar', 'seven'],
    'frequency': [
      {'symbols': [6, 4, 4, 4, 1]},
      {'symbols': [10, 6, 5, 4, 2]},
      {'symbols': [8, 4, 5, 3, 4]},
    ],
    'welcome': 'EVERYONE_WINS',
    'special': 'PITY_PAYOUT',
    'payouts': {
      'cherry': 0.2,
      'cherry|cherry|cherry': 4,
      'heart': 0.2,
      'heart|heart|heart': 6,
      'orange': 0.2,
      'orange|orange|orange': 8,
      'gold bar': 0.2,
      'gold bar|gold bar|gold bar': 10,
      'seven': 10,
      'seven|seven': 20,
      'seven|seven|seven': 50,
    },
  },
  // 110% payout, Simpsons theme
  {
    'maxCoins': 5,
    'slots': 3,
    'symbols': ['maggie', 'lisa', 'marge', 'bart', 'homer'],
    'frequency': [
      {'symbols': [6, 8, 8, 12, 2]},
      {'symbols': [4, 6, 6, 6, 4]},
      {'symbols': [24, 6, 6, 2, 1]},
    ],
    'welcome': 'SIMPSON_GAME',
    'lose': ' <audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/doh.mp3\"/> ',
    'win': ' <audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/woohoo.mp3\"/> ',
    'payouts': {
      'maggie': 2,
      'maggie|maggie': 5,
      'lisa|lisa|lisa': 10,
      'marge|marge|marge': 12,
      'bart|bart|bart': 15,
      'homer': 5,
      'homer|homer': 25,
      'homer|homer|homer': 50,
    },
  },
];

/*
// Games that may come back someday
const graveyard = {
  // Has 104.9% payout
  'loose': {
    'maxCoins': 5,
    'slots': 3,
    'symbols': ['heart', 'bell', 'horseshoe', 'seven', 'gold bar'],
    'frequency': [
      {'symbols': [5, 6, 10, 10, 1]},
      {'symbols': [4, 12, 4, 6, 3]},
      {'symbols': [20, 12, 8, 3, 2]},
    ],
    'payouts': {
      'heart': 2,
      'heart|heart': 4,
      'bell|bell|bell': 5,
      'horseshoe|horseshoe|horseshoe': 6,
      'seven|seven|seven': 10,
      'gold bar': 10,
      'gold bar|gold bar': 25,
      'gold bar|gold bar|gold bar': 1000,
    },
  },
};
*/

module.exports = {
  STARTING_BANKROLL: 100,
  REFRESH_BANKROLL: 100,
  TOURNAMENT_PAYOUT: 50,
  ri: function(key, params) {
    let param;
    let text;

    if (typeof key !== 'string') {
      // Pick one of the options at random
      const choice = Math.floor(Math.random() * Object.keys(params).length);
      text = key[Object.keys(params)[choice]];
    } else {
      text = key;
    }

    for (param in params) {
      if (param) {
        text = text.replace('{' + param + '}', params[param]);
      }
    }
    return text;
  },
  getBankroll: function(attributes) {
    const game = attributes[attributes.currentGame];
    return (game && (game.bankroll !== undefined)) ? game.bankroll : attributes.bankroll;
  },
  getGreeting: function(handlerInput) {
    return getUserTimezone(handlerInput)
    .then((timezone) => {
      if (timezone) {
        const hour = moment.tz(Date.now(), timezone).format('H');
        let greeting;
        if ((hour > 5) && (hour < 12)) {
          greeting = 'GOOD_MORNING';
        } else if ((hour >= 12) && (hour < 18)) {
          greeting = 'GOOD_AFTERNOON';
        } else {
          greeting = 'GOOD_EVENING';
        }

        return handlerInput.jrm.render(ri(greeting));
      } else {
        return '';
      }
    });
  },
  isNextDay: function(handlerInput) {
    return getUserTimezone(handlerInput).then((timezone) => {
      const attributes = handlerInput.attributesManager.getSessionAttributes();
      const tz = (timezone) ? timezone : 'America/Los_Angeles';
      const busted = moment.tz(attributes.busted, tz).format('YYYY-MM-DD');
      const now = moment.tz(Date.now(), tz).format('YYYY-MM-DD');

      return (busted !== now);
    });
  },
  getLocalTournamentTime: function(handlerInput) {
    const times = getTournamentTimes(true);

    if (times) {
      // Get the user timezone
      return getUserTimezone(handlerInput).then((timezone) => {
        const useDefaultTimezone = (timezone === undefined);
        const tz = (timezone) ? timezone : 'America/Los_Angeles';
        const result = moment.tz(times.start.getTime(), tz).format('dddd h a');

        if (useDefaultTimezone) {
          return handlerInput.jrm.render(ri('TOURNAMENT_DEFAULT_TIMEZONE')).then((text) => {
            return {time: result, timezone: text};
          });
        } else {
          return {time: result, timezone: ''};
        }
      });
    } else {
      return Promise.resolve('');
    }
  },
  checkForTournament: function(attributes) {
    // Active on Wednesday PST (Day=3) from 6-7 PM
    // Controlled by TOURNEYTIME environment variable
    let tournamentAvailable;
    const times = getTournamentTimes();
    if (times) {
      tournamentAvailable = ((times.now.getTime() >= times.start.getTime())
        && (times.now.getTime() <= times.end.getTime()));
    } else {
      tournamentAvailable = false;
    }

    if (tournamentAvailable) {
      // Weekly tournament - anchor allows you to force a new game when added
      const anchor = new Date(2018, 4, 22);
      const tournamentIndex =
        Math.floor((Date.now() - anchor) / (1000*60*60*24*7)) % tournaments.length;
      console.log('Adding tournament ' + tournamentIndex);
      Object.assign(games, {tournament: tournaments[tournamentIndex]});
    }

    attributes.temp.tournamentAvailable = tournamentAvailable;
  },
  timeUntilTournament: function(handlerInput) {
    let speech;
    const speechParams = {};

    // How long until the next tournament?
    // This will return a result if there is a tournament in the next 12 hours
    const times = getTournamentTimes();
    if (times) {
      let timeLeft = times.start.getTime() - times.now.getTime();
      if ((timeLeft > 0) && (timeLeft < 12 * 60 * 60 * 1000)) {
        speechParams.Hours = Math.floor(timeLeft / (60 * 60 * 1000));
        speechParams.Minutes = Math.ceil((timeLeft - (speechParams.Hours * 60 * 60 * 1000)) / (60 * 1000));

        // Convert to hours if more than 4 hours
        // Hours and minutes if less than 4 hours
        // Minutes only if less than an hour!
        if (timeLeft > 4 * 60 * 60 * 1000) {
          // Increase hour count by 1 if minutes more than 30
          if (speechParams.Minutes > 30) {
            speechParams.Hours++;
          }
          speech = 'NEXT_TOURNAMENT_HOURS';
        } else if (timeLeft > 60 * 60 * 1000) {
          speech = 'NEXT_TOURNAMENT_HOURS_AND__MINUTES';
        } else {
          speech = 'NEXT_TOURNAMENT_MINUTES';
        }
      }
    }

    if (speech) {
      return handlerInput.jrm.render(ri(speech, speechParams));
    } else {
      return Promise.resolve();
    }
  },
  getRemainingTournamentTime: function(handlerInput) {
    const times = getTournamentTimes();

    if (times) {
      let secondsLeft = Math.floor((times.end.getTime() - times.now.getTime()) / 1000);
      let minutesLeft = Math.floor(secondsLeft / 60);
      secondsLeft -= (minutesLeft * 60);
      let format;

      if (minutesLeft > 5) {
        // Just read minutes, rounded
        if (secondsLeft > 30) {
          minutesLeft++;
        }

        format = 'TOURNAMENT_TIMELEFT_MINUTES';
      } else {
        format = (minutesLeft) ? 'TOURNAMENT_TIMELEFT_MINUTES_AND_SECONDS' : 'TOURNAMENT_TIMELEFT_SECONDS';
      }

      const speechParams = {Minutes: minutesLeft, Seconds: secondsLeft};
      return handlerInput.jrm.render(ri(format, speechParams));
    } else {
      return Promise.resolve('');
    }
  },
  getTournamentComplete: function(handlerInput, attributes) {
    // If the user is in a tournament, we check to see if that tournament
    // is complete.  If so, we set certain attributes and return a result
    // string for the user
    const game = attributes.tournament;

    if (game) {
      // You are in a tournament - let's see if it's completed
      return s3.getObject({Bucket: 'garrett-alexa-usage', Key: 'SlotTournamentResults.txt'}).promise()
      .then((data) => {
        // Yeah, I can do a binary search (this is sorted), but straight search for now
        const results = JSON.parse(data.Body.toString('ascii'));
        let i;
        let result;
        let speech;
        const speechParams = {};

        // Go through the results and find one that closed AFTER our last play
        for (i = 0; i < (results ? results.length : 0); i++) {
          if (results[i].timestamp > game.timestamp) {
            // This is the one
            result = results[i];
            break;
          }
        }

        if (result) {
          if (game.bankroll >= result.highScore) {
            // Congratulations, you won!
            if (!attributes.achievements) {
              attributes.achievements = {trophy: 1};
            } else {
              attributes.achievements.trophy = (attributes.achievements.trophy + 1) || 1;
            }
            attributes.bankroll += module.exports.TOURNAMENT_PAYOUT;
            speech = 'TOURNAMENT_WINNER';
            speechParams.TournamentResult = game.bankroll;
            speechParams.Coins = module.exports.TOURNAMENT_PAYOUT;
          } else {
            speech = 'TOURNAMENT_LOSER';
            speechParams.TournamentWinner = result.highScore;
            speechParams.TournamentResult = game.bankroll;
          }

          if (attributes.currentGame == 'tournament') {
            attributes.currentGame = 'basic';
          }
          attributes['tournament'] = undefined;
          attributes.temp.forceSave = true;
        } else {
          // Tournament hasn't closed yet - is it active?  If not, flip to basic and
          // let them know the tournament is over
          if (!attributes.temp.tournamentAvailable) {
            speech = 'TOURNAMENT_ENDED';
            if (attributes.currentGame == 'tournament') {
              attributes.currentGame = 'basic';
            }
          }
        }

        if (speech) {
          return handlerInput.jrm.render(ri(speech, speechParams));
        } else {
          return '';
        }
      });
    } else {
      // No-op, you weren't playing
      return Promise.resolve('');
    }
  },
  getGame: function(name) {
    return games[name];
  },
  readAvailableGames: function(handlerInput, currentFirst) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const choices = [];
    const choiceText = [];
    let game;
    let gameToAdd = attributes.currentGame;
    let offerTournament = false;
    const availableProducts = [];
    const forPurchase = [];

    if (attributes.temp.tournamentAvailable) {
      // If they already busted out, don't offer it
      if (!attributes.tournament || !attributes.tournament.busted) {
        // Offer the tournament
        offerTournament = true;
        if (currentFirst) {
          gameToAdd = 'tournament';
        }
      }
    }

    if (games[gameToAdd] && games[gameToAdd].product && attributes.paid
      && attributes.paid[games[gameToAdd].product]
      && (attributes.paid[games[gameToAdd].product].state !== 'PURCHASED')) {
      // Pick a different game to add
      attributes[attributes.currentGame] = undefined;
      attributes.currentGame = 'standard';
      gameToAdd = 'standard';
    }

    for (game in games) {
      if (game && (game !== gameToAdd)) {
        if (games[game].product) {
          // We only offer this game if it is purchased
          if (attributes.paid && attributes.paid[games[game].product]) {
            if (attributes.paid[games[game].product].state === 'PURCHASED') {
              choices.push(game);
              choiceText.push(ri('GAME_LIST_' + game.toUpperCase()));
            } else {
              availableProducts.push(game);
              forPurchase.push(ri('GAME_LIST_' + game.toUpperCase()));
            }
          }
        } else if ((game != 'tournament') || offerTournament) {
          choices.push(game);
          choiceText.push(ri('GAME_LIST_' + game.toUpperCase()));
        }
      }
    }

    if (gameToAdd && games[gameToAdd]) {
      if (currentFirst) {
        choices.unshift(gameToAdd);
        choiceText.unshift(ri('GAME_LIST_' + gameToAdd.toUpperCase()));
      } else {
        choices.push(gameToAdd);
        choiceText.push(ri('GAME_LIST_' + gameToAdd.toUpperCase()));
      }
    }

    return handlerInput.jrm.renderBatch(choiceText)
    .then((gameList) => {
      const speechParams = {};
      speechParams.GameChoices = speechUtils.and(gameList, {locale: event.request.locale});
      speechParams.Number = choices.length;
      return handlerInput.jrm.render(ri('AVAILABLE_GAMES', speechParams));
    }).then((speech) => {
      return {speech: speech, choices: choices, forPurchase: forPurchase,
        availableProducts: availableProducts};
    });
  },
  readPayout: function(handlerInput, game, payout) {
    return readPayoutInternal(handlerInput, game, payout, ' <break time=\"200ms\"/> ');
  },
  readPayoutTable: function(handlerInput, game) {
    let text = '';
    let payout;
    const renderItems = [];

    for (payout in game.payouts) {
      if (payout) {
        if (game.progressive && (game.progressive.match === payout)) {
          renderItems.push(ri('PAYOUT_RATES_PROGRESSIVE'));
        } else {
          renderItems.push(ri('PAYOUT_RATES_COINS', {Coins: game.payouts[payout]}));
        }
      }
    }

    return handlerInput.jrm.renderBatch(renderItems)
    .then((payoutAmounts) => {
      let i = 0;
      for (payout in game.payouts) {
        if (payout) {
          // Special case if it's the progressive
          text += readPayoutInternal(handlerInput, game, payout, ' ');
          text += payoutAmounts[i++];
          text += '\n';
        }
      }

      return text;
    });
  },
  readLeaderBoard: function(userId, game, attributes) {
    let leaderURL = process.env.SERVICEURL + 'slots/leaders';
    let myScore;
    const params = {};

    return new Promise((resolve, reject) => {
      if (attributes[game] && (attributes[game].bankroll !== undefined)) {
        params.game = game;
        myScore = attributes[game].bankroll;
      } else {
        params.game = 'high';
        myScore = attributes.high;
      }
      params.userId = userId;
      params.score = myScore;

      const paramText = querystring.stringify(params);
      if (paramText.length) {
        leaderURL += '?' + paramText;
      }

      request(
        {
          uri: leaderURL,
          method: 'GET',
          timeout: 1000,
        }, (err, response, body) => {
          let leaders;

          if (!err) {
            leaders = JSON.parse(body);
            leaders.score = myScore;
          }

          resolve(leaders);
      });
    });
  },
  updateLeaderBoard: function(event, attributes) {
    // Update the leader board
    const formData = {
      userId: event.session.user.userId,
      attributes: JSON.stringify(attributes),
    };
    const params = {
      url: process.env.SERVICEURL + 'slots/updateLeaderBoard',
      formData: formData,
    };
    request.post(params, (err, res, body) => {
      if (err) {
        console.log(err);
      }
    });
  },
  getProgressivePayout: function(attributes) {
    const rules = games[attributes.currentGame];

    // If there is no progressive for this game, just return undefined
    if (rules && rules.progressive) {
      // Read from Dynamodb
      const item = {TableName: 'Slots', Key: {userId: {S: 'game-' + attributes.currentGame}}};
      return dynamodb.getItem(item).promise().then((data) => {
        const coins = (data.Item.coins && data.Item.coins.N)
          ? parseInt(data.Item.coins.N) : rules.progressive.start;

        return Math.floor(rules.progressive.start + (coins * rules.progressive.rate));
      }).catch((err) => {
        return Promise.resolve((attributes[attributes.currentGame].progressiveJackpot)
          ? attributes[attributes.currentGame].progressiveJackpot
          : rules.progressive.start);
      });
    } else {
      return Promise.resolve();
    }
  },
  incrementProgressive: function(attributes, coinsToAdd) {
    if (games[attributes.currentGame].progressive) {
      const params = {
          TableName: 'Slots',
          Key: {userId: {S: 'game-' + attributes.currentGame}},
          AttributeUpdates: {coins: {
              Action: 'ADD',
              Value: {N: coinsToAdd.toString()}},
          }};

      dynamodb.updateItem(params, (err, data) => {
        if (err) {
          console.log(err);
        }
      });
    }
  },
  selectGame: function(handlerInput, choice) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    attributes.currentGame = attributes.choices[choice];
    attributes.choices = undefined;
    attributes.originalChoices = undefined;

    if (!attributes[attributes.currentGame]) {
      attributes[attributes.currentGame] = {};

      // If this is tournament, keep track of number of tournaments played
      // Tournaments also have separate bankrolls
      if (attributes.currentGame == 'tournament') {
        attributes.tournamentsPlayed = (attributes.tournamentsPlayed + 1) || 1;
        attributes.tournament.bankroll = 1000;
        attributes.tournament.high = 1000;
      }
    }

    const game = attributes[attributes.currentGame];
    return module.exports.getProgressivePayout(attributes).then((jackpot) => {
      if (jackpot) {
        game.progressiveJackpot = jackpot;
      }
    });
  },
  drawTable: function(handlerInput) {
    const response = handlerInput.jrb;
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const game = attributes[attributes.currentGame];
    let image;
    const displayParams = {};

    if (attributes.temp && event.context && event.context.System &&
      event.context.System.device &&
      event.context.System.device.supportedInterfaces &&
      event.context.System.device.supportedInterfaces.Display) {
      attributes.display = true;

      if (attributes.originalChoices) {
        let i;
        const listItems = [];
        const gameList = [];

        for (i = 0; i < attributes.originalChoices.length; i++) {
          gameList.push(ri('GAME_LIST_' + attributes.originalChoices[i].toUpperCase()));
        }
        return handlerInput.jrm.renderBatch(gameList)
        .then((renderItems) => {
          for (i = 0; i < attributes.originalChoices.length; i++) {
            listItems.push({
              'token': 'game.' + i,
              'textContent': {
                'primaryText': {
                  'type': 'RichText',
                  'text': '<font size=\"7\">' + renderItems[i] + '</font>',
                },
              },
            });
          }

          image = new Alexa.ImageHelper()
            .addImageInstance('http://garrettvargas.com/img/slot-background.png')
            .getImage();

          return handlerInput.jrm.renderObject(ri('DISPLAY_DIRECTIVE_CHOICES')).then((directive) => {
            directive.backgroundImage = image;
            directive.listItems = listItems;
            response.addRenderTemplateDirective(directive);
          });
        });
      } else if (!attributes.temp.spinColor && game && game.result && game.result.spin) {
        let name = '';
        game.result.spin.forEach((spin) => {
          if (name.length > 0) {
            name += '-';
          }
          name += spin;
        });

        const title = (game.result.payout) ? 'DISPLAY_PAYOUT_WINNER' : 'DISPLAY_PAYOUT_LOSER';
        displayParams.Coins = game.result.payout;
        image = new Alexa.ImageHelper()
          .addImageInstance('https://s3.amazonaws.com/garrett-alexa-images/slots/' + name + '.png')
          .getImage();
        return handlerInput.jrm.renderObject(ri(title, displayParams)).then((directive) => {
          directive.backgroundImage = image;
          response.addRenderTemplateDirective(directive);
        });
      } else {
        // Just show the background image
        return handlerInput.jrm.render(ri('DISPLAY_WELCOME')).then((welcome) => {
          image = new Alexa.ImageHelper()
            .withDescription(welcome)
            .addImageInstance('http://garrettvargas.com/img/slot-background.png')
            .getImage();
          response.addRenderTemplateDirective({
            type: 'BodyTemplate1',
            backButton: 'HIDDEN',
            backgroundImage: image,
          });
        });
      }
    } else {
      return Promise.resolve();
    }
  },
  mapProduct: function(handlerInput, product) {
    return handlerInput.jrm.renderObject(ri('PRODUCT_MAP_LIST'))
    .then((productList) => {
      return getBestMatch(productList, product.toUpperCase());
    });
  },
  estimateDuration: function(speech) {
    let duration = 0;
    let text = speech;
    let index;
    let end;
    const soundList = [
      {file: 'soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_positive_response_01', length: 1000},
      {file: 'https://s3-us-west-2.amazonaws.com/alexasoundclips/casinowelcome.mp3', length: 2750},
      {file: 'https://s3-us-west-2.amazonaws.com/alexasoundclips/dice.mp3', length: 650},
      {file: 'https://s3-us-west-2.amazonaws.com/alexasoundclips/doh.mp3', length: 680},
      {file: 'https://s3-us-west-2.amazonaws.com/alexasoundclips/woohoo.mp3', length: 950},
      {file: 'https://s3-us-west-2.amazonaws.com/alexasoundclips/pullandspin.mp3', length: 3850},
      {file: 'https://s3-us-west-2.amazonaws.com/alexasoundclips/slotstop.mp3', length: 325},
      {file: 'https://s3-us-west-2.amazonaws.com/alexasoundclips/jackpot.mp3', length: 6400},
      {file: 'https://s3-us-west-2.amazonaws.com/alexasoundclips/simpsons.mp3', length: 5100},
      {file: 'https://s3-us-west-2.amazonaws.com/alexasoundclips/batman.mp3', length: 4050},
    ];

    // Look for and remove all audio clips
    while (text.indexOf('<audio') > -1) {
      index = text.indexOf('<audio');
      end = text.indexOf('>', index);
      const str = text.substring(index, end);

      soundList.forEach((sound) => {
        if (str.indexOf(sound.file) > -1) {
          duration += sound.length;
        }
      });

      text = text.substring(0, index) + text.substring(end + 1);
    }

    // Find and strip out all breaks
    while (text.indexOf('<break') > -1) {
      // Extract the number
      index = text.indexOf('<break');
      end = text.indexOf('>', index);

      // We're assuming the break time is in ms
      const str = text.substring(index, end);
      const time = parseInt(str.match(/\d/g).join(''));
      if (!isNaN(time)) {
        duration += time;
      }

      // And skip this one
      text = text.substring(0, index) + text.substring(end + 1);
    }

    // 60 ms for each remaining character
    duration += 60 * text.length;
    return duration;
  },
};

function readPayoutInternal(handlerInput, game, payout, pause) {
  const attributes = handlerInput.attributesManager.getSessionAttributes();
  const slots = payout.split('|');
  let text = '';
  let i;

  for (i = 0; i < slots.length; i++) {
    text += attributes.temp.symbolList[slots[i]];
    text += pause;
  }

  for (i = slots.length; i < game.slots; i++) {
    text += attributes.temp.symbolList.any;
    text += pause;
  }

  return text;
}

function getTournamentTimes(leaveUTC) {
  let retVal;

  if (process.env.TOURNEYTIME) {
    const times = JSON.parse(process.env.TOURNEYTIME);
    const tzOffset = moment.tz.zone('America/Los_Angeles').utcOffset(Date.now());
    const d = new Date();
    d.setMinutes(d.getMinutes() - tzOffset);
    retVal = {};

    // Find the next (or current!) tournament - to do that, we'll see
    // which ending time is closest to now
    times.forEach((time) => {
      if ((time.day !== undefined) && (time.hour !== undefined)) {
        // First build off today's date
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        start.setHours(time.hour);
        if (time.minute !== undefined) {
          start.setMinutes(time.minute);
        } else {
          start.setMinutes(0);
        }

        // Now set the day of week
        let offset = time.day - d.getDay();
        if (offset < 0) {
          offset += 7;
        }
        start.setDate(start.getDate() + offset);

        // End is minutes after
        const end = new Date(start.getTime());
        if (time.length) {
          end.setMinutes(end.getMinutes() + time.length);
        } else {
          end.setMinutes(end.getMinutes() + 60);
        }

        // Final check - if end comes before now, then add 7 days to
        // both start and end
        if (end.getTime() < d.getTime()) {
          start.setDate(start.getDate() + 7);
          end.setDate(end.getDate() + 7);
        }

        if (leaveUTC) {
          start.setMinutes(start.getMinutes() + tzOffset);
          end.setMinutes(end.getMinutes() + tzOffset);
          d.setMinutes(d.getMinutes() + tzOffset);
        }

        // OK, if the end is closer to d than the previous candidate
        // we'll use that as the tournament time
        if (!retVal.end || ((end - d) < (retVal.end - retVal.now))) {
          retVal.start = start;
          retVal.end = end;
          retVal.now = d;
        }
      }
    });
  }

  return retVal;
}

function getUserTimezone(handlerInput) {
  const event = handlerInput.requestEnvelope;
  const usc = handlerInput.serviceClientFactory.getUpsServiceClient();

  return usc.getSystemTimeZone(event.context.System.device.deviceId)
  .then((timezone) => {
    return timezone;
  })
  .catch((error) => {
    // OK if the call fails, return gracefully
    return;
  });
}

function getBestMatch(mapping, value) {
  const valueLen = value.length;
  let map;
  let ratio;
  let bestMapping;
  let bestRatio = 0;

  for (map in mapping) {
    if (map) {
      let index;
      for (index in mapping[map]) {
        if (index) {
          const str = mapping[map][index];
          const lensum = str.length + valueLen;
          ratio = Math.round(100 * ((lensum - leven(value, str)) / lensum));
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestMapping = map;
          }
        }
      }
    }
  }

  if (bestRatio < 90) {
    console.log('Near match: ' + bestMapping + ', ' + bestRatio);
  }
  return bestMapping;
}
