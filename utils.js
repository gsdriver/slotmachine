//
// Utility functions
//

'use strict';

const Alexa = require('alexa-sdk');
// utility methods for creating Image and TextField objects
const makeRichText = Alexa.utils.TextUtils.makeRichText;
const makeImage = Alexa.utils.ImageUtils.makeImage;
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const speechUtils = require('alexa-speech-utils')();
const request = require('request');
const querystring = require('querystring');

// Global session ID
let globalEvent;

const games = {
  // Has 99.8% payout
  'basic': {
    'maxCoins': 5,
    'slots': 3,
    'canReset': true,
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
    'canReset': true,
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
    'canReset': true,
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
    'canReset': true,
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

// Tournament with 105% payout
const tournament = {
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
 'payouts': {
   'cherry': 2,
   'bell|bell|bell': 5,
   'bar|bar|bar': 10,
   'seven|seven|seven': 20,
   'diamond|diamond|diamond': 100,
   'cherry|cherry|cherry': 1000,
 },
};

module.exports = {
  emitResponse: function(context, error, response, speech, reprompt, cardTitle, cardText) {
    const formData = {};

    // Async call to save state and logs if necessary
    if (process.env.SAVELOG) {
      const result = (error) ? error : ((response) ? response : speech);
      formData.savelog = JSON.stringify({
        event: globalEvent,
        result: result,
      });
    }
    if (response) {
      formData.savedb = JSON.stringify({
        userId: globalEvent.session.user.userId,
        attributes: globalEvent.session.attributes,
      });
    }

    if (formData.savelog || formData.savedb) {
      const params = {
        url: process.env.SERVICEURL + 'slots/saveState',
        formData: formData,
      };
      request.post(params, (err, res, body) => {
        if (err) {
          console.log(err);
        }
      });
    }

    if (!process.env.NOLOG) {
      console.log(JSON.stringify(globalEvent));
    }

    buildDisplayTemplate(context);
    if (error) {
      const res = require('./' + context.event.request.locale + '/resources');
      console.log('Speech error: ' + error);
      context.response.speak(error)
        .listen(res.strings.ERROR_REPROMPT);
    } else if (response) {
      context.response.speak(response);
    } else if (cardTitle) {
      context.response.speak(speech)
        .listen(reprompt)
        .cardRenderer(cardTitle, cardText);
    } else {
      context.response.speak(speech)
        .listen(reprompt);
    }

    context.emit(':responseReady');
  },
  setEvent: function(event) {
    globalEvent = event;
  },
  checkForTournament: function() {
    // As part of launch, check if we need to add a tournament machine
    if (process.env.TOURNAMENT) {
      games.tournament = tournament;
    }
  },
  getRemainingTournamentTime: function(context) {
    const res = require('./' + context.event.request.locale + '/resources');
    const now = new Date();
    let text;

    // Ends at the top of the hour
    let minutesLeft = 59 - now.getMinutes();
    const secondsLeft = 60 - now.getSeconds();
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
        text = res.strings.TOURNAMENT_TIMELEFT_MINUTES_AND_SECONDS
          .replace('{0}', secondsLeft);
      }
    }

    return text;
  },
  getTournamentComplete: function(locale, attributes, callback) {
    // If the user is in a tournament, we check to see if that tournament
    // is complete.  If so, we set certain attributes and return a result
    // string via the callback for the user
    const game = attributes.tournament;
    const res = require('./' + locale + '/resources');

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
  readAvailableGames: function(context, currentFirst, callback) {
    const res = require('./' + context.event.request.locale + '/resources');
    let speech;
    const choices = [];
    const choiceText = [];
    let game;
    let count = 0;
    let gameToAdd = context.attributes.currentGame;
    let offerTournament = false;

    if (games.tournament) {
      // If they already busted out, don't offer it
      if (!context.attributes.tournament || !context.attributes.tournament.busted) {
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
           choiceText.push(res.sayGame(game));
         }
       }
      }
    }

    if (gameToAdd && games[gameToAdd]) {
      if (currentFirst) {
        choices.unshift(gameToAdd);
        choiceText.unshift(res.sayGame(gameToAdd));
      } else {
         choices.push(gameToAdd);
         choiceText.push(res.sayGame(gameToAdd));
      }
    }

    speech = res.strings.AVAILABLE_GAMES.replace('{0}', count);
    speech += speechUtils.and(choiceText, {locale: context.event.request.locale});
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
      params.game = game;
      if (currentGame.spins > 0) {
        params.userId = userId;
        params.score = currentGame.bankroll;
        myScore = currentGame.bankroll;
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

function buildDisplayTemplate(context) {
  const game = context.attributes[context.attributes.currentGame];
  const res = require('./' + context.event.request.locale + '/resources');
  let listTemplateBuilder;
  let listItemBuilder;
  let listTemplate;

  if (context.event.context &&
      context.event.context.System.device.supportedInterfaces.Display) {
    context.attributes.display = true;

    if (context.attributes.originalChoices) {
      listItemBuilder = new Alexa.templateBuilders.ListItemBuilder();
      listTemplateBuilder = new Alexa.templateBuilders.ListTemplate1Builder();
      let i = 0;

      context.attributes.originalChoices.forEach((choice) => {
        listItemBuilder.addItem(null, 'game.' + i++,
          makeRichText('<font size="7">' + res.sayGame(choice) + '</font>'));
      });

      const listItems = listItemBuilder.build();
      listTemplate = listTemplateBuilder
        .setToken('listToken')
        .setTitle(res.strings.SELECT_GAME)
        .setListItems(listItems)
        .setBackButtonBehavior('HIDDEN')
        .setBackgroundImage(makeImage('http://garrettvargas.com/img/slot-background.png'))
        .build();

      context.response.renderTemplate(listTemplate);
    } else if (game && game.result && game.result.spin) {
      listItemBuilder = new Alexa.templateBuilders.ListItemBuilder();
      listTemplateBuilder = new Alexa.templateBuilders.ListTemplate2Builder();
      const format = 'https://s3-us-west-2.amazonaws.com/garrettvargas.com/img/slotmachine/slots/{0}.png';
      let i = 0;

      game.result.spin.forEach((spin) => {
        listItemBuilder.addItem(makeImage(format.replace('{0}', spin)), 'slot.' + i++);
      });

      const title = (game.result.payout)
        ? res.strings.DISPLAY_PAYOUT_WINNER.replace('{0}', game.result.payout)
        : res.strings.DISPLAY_PAYOUT_LOSER;
      const listItems = listItemBuilder.build();
      const listTemplate = listTemplateBuilder
        .setToken('listToken')
        .setTitle(title)
        .setListItems(listItems)
        .setBackButtonBehavior('HIDDEN')
        .setBackgroundImage(makeImage('http://garrettvargas.com/img/slot-background.png'))
        .build();

      context.response.renderTemplate(listTemplate);
    } else {
      // Just show the background image
      const builder = new Alexa.templateBuilders.BodyTemplate6Builder();
      const template = builder.setTitle(res.strings.LAUNCH_WELCOME)
        .setBackgroundImage(makeImage('http://garrettvargas.com/img/slot-background.png'))
        .setBackButtonBehavior('HIDDEN')
        .build();

      context.response.renderTemplate(template);
    }
  }
}
