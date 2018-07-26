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

module.exports = {
  getBankroll: function(attributes) {
    const game = attributes[attributes.currentGame];
    return (game && (game.bankroll !== undefined)) ? game.bankroll : attributes.bankroll;
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

    if (attributes.temp.tournamentAvailable && !tournamentAvailable) {
      // Tournament was available, now it's not - force a database save
      attributes.temp.forceSave = true;
    } else {
      attributes.temp.forceSave = undefined;
    }

    attributes.temp.tournamentAvailable = tournamentAvailable;
  },
  timeUntilTournament: function() {
    // How long until the next tournament?
    const times = getTournamentTimes();
    if (times) {
      let timeLeft = times.start.getTime() - times.now.getTime();
      if (timeLeft < 0) {
        // Tournament is probably active
        timeLeft += 7 * 24 * 60 * 60 * 1000;
      }

      const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeLeft - (daysLeft * 1000 * 60 * 60 * 24))
            / (1000 * 60 * 60));
      return {days: daysLeft, hours: hoursLeft};
    }

    return undefined;
  },
  getRemainingTournamentTime: function(event) {
    const res = require('./resources')(event.request.locale);
    let text = '';
    const times = getTournamentTimes();

    if (times) {
      let secondsLeft = Math.floor((times.end.getTime() - times.now.getTime()) / 1000);
      let minutesLeft = Math.floor(secondsLeft / 60);
      secondsLeft -= (minutesLeft * 60);

      if (minutesLeft > 5) {
        // Just read minutes, rounded
        if (secondsLeft > 30) {
          minutesLeft++;
        }
        text = res.strings.TOURNAMENT_TIMELEFT_MINUTES
          .replace('{0}', minutesLeft);
      } else {
        if (minutesLeft) {
          text = res.strings.TOURNAMENT_TIMELEFT_MINUTES_AND_SECONDS
            .replace('{0}', minutesLeft)
            .replace('{1}', secondsLeft);
        } else {
          text = res.strings.TOURNAMENT_TIMELEFT_SECONDS
            .replace('{0}', secondsLeft);
        }
      }
    }

    return text;
  },
  getTournamentComplete: function(event, attributes, callback) {
    // If the user is in a tournament, we check to see if that tournament
    // is complete.  If so, we set certain attributes and return a result
    // string via the callback for the user
    const game = attributes.tournament;
    const res = require('./resources')(event.request.locale);

    if (game) {
      // You are in a tournament - let's see if it's completed
      s3.getObject({Bucket: 'garrett-alexa-usage', Key: 'SlotTournamentResults.txt'}, (err, data) => {
        if (err) {
          console.log(err, err.stack);
          callback('');
        } else {
          // Yeah, I can do a binary search (this is sorted), but straight search for now
          const results = JSON.parse(data.Body.toString('ascii'));
          let i;
          let result;
          let speech = '';

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
              speech = res.strings.TOURNAMENT_WINNER.replace('{0}', game.bankroll);
            } else {
              speech = res.strings.TOURNAMENT_LOSER.replace('{0}', result.highScore).replace('{1}', game.bankroll);
            }

            if (attributes.currentGame == 'tournament') {
              attributes.currentGame = 'basic';
            }
            attributes['tournament'] = undefined;
          } else {
            // Tournament hasn't closed yet - is it active?  If not, flip to basic and
            // let them know the tournament is over
            if (!attributes.temp.tournamentAvailable) {
              speech = res.strings.TOURNAMENT_ENDED;
              if (attributes.currentGame == 'tournament') {
                attributes.currentGame = 'basic';
              }
            }
          }

          callback(speech);
        }
      });
    } else {
      // No-op, you weren't playing
      callback('');
    }
  },
  getGame: function(name) {
    return games[name];
  },
  readAvailableGames: function(event, attributes, currentFirst) {
    const res = require('./resources')(event.request.locale);
    let speech;
    const choices = [];
    const choiceText = [];
    let game;
    let count = 0;
    let gameToAdd = attributes.currentGame;
    let offerTournament = false;

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

    for (game in games) {
      if (game) {
        if ((game != 'tournament') || offerTournament) {
          count++;
          // Put the last played game at the front of the list
          if (game != gameToAdd) {
           choices.push(game);
           choiceText.push(module.exports.sayGame(event, game));
         }
       }
      }
    }

    if (gameToAdd && games[gameToAdd]) {
      if (currentFirst) {
        choices.unshift(gameToAdd);
        choiceText.unshift(module.exports.sayGame(event, gameToAdd));
      } else {
         choices.push(gameToAdd);
         choiceText.push(module.exports.sayGame(event, gameToAdd));
      }
    }

    speech = res.strings.AVAILABLE_GAMES.replace('{0}', count);
    speech += speechUtils.and(choiceText, {locale: event.request.locale});
    speech += '. ';
    return {speech: speech, choices: choices};
  },
  readCoins: function(event, coins) {
    const res = require('./resources')(event.request.locale);
    return speechUtils.numberOfItems(coins, res.strings.SINGLE_COIN, res.strings.PLURAL_COIN);
  },
  readPayout: function(event, game, payout) {
    return readPayoutInternal(event, game, payout, ' <break time=\"200ms\"/> ');
  },
  readPayoutTable: function(event, game) {
    const res = require('./resources')(event.request.locale);
    let text = '';
    let payout;
    let i;

    for (i = 0; i < (game.wild ? game.wild.length : 0); i++) {
      text += res.strings.WILD_SYMBOL.replace('{0}', module.exports.saySymbol(event, game.wild[i]));
      text += '\n';
    }

    for (payout in game.payouts) {
      if (payout) {
        // Special case if it's the progressive
        text += readPayoutInternal(event, game, payout, ' ');
        text += module.exports.readPayoutAmount(event, game, payout);
        text += '\n';
      }
    }

    return text;
  },
  readPayoutAmount: function(event, game, payout) {
    const res = require('./resources')(event.request.locale);
    let text;

    if (game.progressive && (game.progressive.match === payout)) {
      text = res.strings.PAYOUT_PROGRESSIVE;
    } else {
      text = res.strings.PAYOUT_PAYS.replace('{0}', game.payouts[payout]);
    }

    return text;
  },
  readLeaderBoard: function(userId, game, attributes, callback) {
    let leaderURL = process.env.SERVICEURL + 'slots/leaders';
    let myScore;
    const params = {};

    if (game === 'achievement') {
      myScore = module.exports.getAchievementScore(attributes.achievements);
      if (myScore > 0) {
        params.userId = userId;
        params.score = myScore;
      }
    } else {
      const currentGame = attributes[game];
      const bankroll = module.exports.getBankroll(attributes);
      params.game = game;
      if (currentGame.spins > 0) {
        params.userId = userId;
        params.score = bankroll;
        myScore = bankroll;
      }
    }

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
        callback(err, leaders);
    });
  },
  getProgressivePayout: function(attributes, callback) {
    const rules = games[attributes.currentGame];

    // If there is no progressive for this game, just return undefined
    if (rules && rules.progressive) {
      // Read from Dynamodb
      dynamodb.getItem({TableName: 'Slots', Key: {userId: {S: 'game-' + attributes.currentGame}}},
              (err, data) => {
        if (err || (data.Item === undefined)) {
          console.log(err);
          callback((attributes[attributes.currentGame].progressiveJackpot)
                ? attributes[attributes.currentGame].progressiveJackpot
                : rules.progressive.start);
        } else {
          let coins;

          if (data.Item.coins && data.Item.coins.N) {
            coins = parseInt(data.Item.coins.N);
          } else {
            coins = rules.progressive.start;
          }

          callback(Math.floor(rules.progressive.start + (coins * rules.progressive.rate)));
        }
      });
    } else {
      callback(undefined);
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
  getAchievementScore: function(achievements) {
    let achievementScore = 0;

    if (achievements) {
      if (achievements.trophy) {
        achievementScore += 100 * achievements.trophy;
      }
      if (achievements.gamedaysPlayed) {
        achievementScore += 10 * achievements.gamedaysPlayed;
      }
      if (achievements.jackpot) {
        achievementScore += 25 * achievements.jackpot;
      }
      if (achievements.streakScore) {
        achievementScore += achievements.streakScore;
      }
    }

    return achievementScore;
  },
  selectGame: function(attributes, choice) {
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
    return new Promise((resolve, reject) => {
      // Check if there is a progressive jackpot and save it
      module.exports.getProgressivePayout(attributes, (jackpot) => {
        if (jackpot) {
          game.progressiveJackpot = jackpot;
        }
        resolve();
      });
    });
  },
  sayGame: function(event, game) {
    const res = require('./resources')(event.request.locale);
    const gameMap = JSON.parse(res.strings.GAME_LIST);
    return (gameMap[game]) ? gameMap[game] : game;
  },
  saySymbol: function(event, symbol) {
    const res = require('./resources')(event.request.locale);
    const symbolMap = JSON.parse(res.strings.SYMBOL_LIST);
    return (symbolMap[symbol]) ? symbolMap[symbol] : symbol;
  },
  drawTable: function(handlerInput) {
    const response = handlerInput.responseBuilder;
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('./resources')(event.request.locale);
    const game = attributes[attributes.currentGame];
    let image;

    if (event.context && event.context.System &&
      event.context.System.device &&
      event.context.System.device.supportedInterfaces &&
      event.context.System.device.supportedInterfaces.Display) {
      attributes.display = true;

      if (attributes.originalChoices) {
        let i = 0;
        const listItems = [];

        attributes.originalChoices.forEach((choice) => {
          listItems.push({
            'token': 'game.' + i++,
            'textContent': {
              'primaryText': {
                'type': 'RichText',
                'text': '<font size=\"7\">' + module.exports.sayGame(event, choice) + '</font>',
              },
            },
          });
        });

        image = new Alexa.ImageHelper()
          .withDescription(res.strings.SELECT_GAME)
          .addImageInstance('http://garrettvargas.com/img/slot-background.png')
          .getImage();
        response.addRenderTemplateDirective({
          type: 'ListTemplate1',
          token: 'listToken',
          backButton: 'HIDDEN',
          backgroundImage: image,
          listItems: listItems,
        });
      } else if (game && game.result && game.result.spin) {
        let name = '';
        game.result.spin.forEach((spin) => {
          if (name.length > 0) {
            name += '-';
          }
          name += spin;
        });

        const title = (game.result.payout)
          ? res.strings.DISPLAY_PAYOUT_WINNER.replace('{0}', game.result.payout)
          : res.strings.DISPLAY_PAYOUT_LOSER;

        image = new Alexa.ImageHelper()
          .withDescription(title)
          .addImageInstance('https://s3.amazonaws.com/garrett-alexa-images/slots/' + name + '.png')
          .getImage();
        response.addRenderTemplateDirective({
          type: 'BodyTemplate1',
          backButton: 'HIDDEN',
          backgroundImage: image,
        });
      } else {
        // Just show the background image
        image = new Alexa.ImageHelper()
          .withDescription(res.strings.LAUNCH_WELCOME)
          .addImageInstance('http://garrettvargas.com/img/slot-background.png')
          .getImage();
        response.addRenderTemplateDirective({
          type: 'BodyTemplate1',
          backButton: 'HIDDEN',
          backgroundImage: image,
        });
      }
    }
  },
  startButtonInput: function(handlerInput) {
    // We'll allow them to press the button again
    handlerInput.responseBuilder.addDirective({
      'type': 'GameEngine.StartInputHandler',
      'timeout': 30000,
      'recognizers': {
        'button_down_recognizer': {
          'type': 'match',
          'fuzzy': false,
          'anchor': 'end',
          'pattern': [{
            'action': 'down',
          }],
        },
      },
      'events': {
        'button_down_event': {
          'meets': ['button_down_recognizer'],
          'reports': 'matches',
          'shouldEndInputHandler': true,
        },
        'timeout': {
          'meets': ['timed out'],
          'reports': 'history',
          'shouldEndInputHandler': true,
        },
      },
    });
  },
  buildButtonDownAnimationDirective: function(targetGadgets) {
    return {
      'type': 'GadgetController.SetLight',
      'version': 1,
      'targetGadgets': targetGadgets,
      'parameters': {
        'animations': [{
          'repeat': 1,
          'targetLights': ['1'],
          'sequence': [{
            'durationMs': 500,
            'color': 'FFFF00',
            'intensity': 255,
            'blend': false,
          }],
        }],
        'triggerEvent': 'buttonDown',
        'triggerEventTimeMs': 0,
      },
    };
  },
};

function readPayoutInternal(event, game, payout, pause) {
  const res = require('./resources')(event.request.locale);
  const slots = payout.split('|');
  let text = '';
  let i;

  for (i = 0; i < slots.length; i++) {
    text += module.exports.saySymbol(event, slots[i]);
    text += pause;
  }

  for (i = slots.length; i < game.slots; i++) {
    text += res.strings.ANY_SLOT;
    text += pause;
  }

  return text;
}

function getTournamentTimes() {
  let retVal;

  if (process.env.TOURNEYTIME) {
    const times = JSON.parse(process.env.TOURNEYTIME);

    if ((times.day !== undefined) && (times.hour !== undefined)) {
      retVal = {};

      // First build off today's date
      const d = new Date();
      d.setHours(d.getHours() - 7);

      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      start.setHours(times.hour);
      if (times.minute !== undefined) {
        start.setMinutes(times.minute);
      } else {
        start.setMinutes(0);
      }

      // Now set the day of week
      let offset = times.day - d.getDay();
      if (offset < 0) {
        offset += 7;
      }
      start.setDate(start.getDate() + offset);

      // End is minutes after
      const end = new Date(start.getTime());
      if (times.length) {
        end.setMinutes(end.getMinutes() + times.length);
      } else {
        end.setMinutes(end.getMinutes() + 60);
      }

      // Final check - if end comes before now, then add 7 days to
      // both start and end
      if (end.getTime() < d.getTime()) {
        start.setDate(start.getDate() + 7);
        end.setDate(end.getDate() + 7);
      }

      retVal.start = start;
      retVal.end = end;
      retVal.now = d;
    }
  }

  return retVal;
}
