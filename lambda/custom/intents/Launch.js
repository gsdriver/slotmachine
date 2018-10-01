//
// Handles opening the skill
//

'use strict';

const utils = require('../utils');
const buttons = require('../buttons');

module.exports = {
  canHandle: function(handlerInput) {
    return handlerInput.requestEnvelope.session.new ||
      (handlerInput.requestEnvelope.request.type === 'LaunchRequest');
  },
  handle: function(handlerInput) {
    const event = handlerInput.requestEnvelope;
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const res = require('../resources')(event.request.locale);
    let response;

    return new Promise((resolve, reject) => {
      utils.getGreeting(event, (greeting) => {
        utils.getPurchasedProducts(handlerInput, (err, result) => {
          let speech = '';
          let reprompt;

          if (attributes.tournamentResult) {
            speech += attributes.tournamentResult;
            attributes.tournamentResult = undefined;
          }

          // First off - are they out of money?
          if (attributes.busted) {
            if (attributes.paid && attributes.paid.coinreset && (attributes.paid.coinreset.state == 'PURCHASED')) {
              speech += res.strings.SUBSCRIPTION_PAID_REPLENISH;
              attributes.temp.speechParams.Coins = utils.STARTING_BANKROLL;
              attributes.bankroll += utils.STARTING_BANKROLL;
              attributes.busted = undefined;
              finishResponse();
            } else if (attributes.temp.tournamentAvailable) {
              // If the tournament is available, we'll throw 5 coins at you to play
              speech += res.strings.LAUNCH_BUSTED_TOURNAMENT;
              attributes.bankroll += 5;
              attributes.busted = undefined;
              finishResponse();
            } else {
              // Is it the next day or not?
              utils.isNextDay(event, attributes, (nextDay) => {
                if (!nextDay) {
                  // Here's the place to do an upsell if we can!
                  if (!attributes.temp.noUpsell && attributes.paid && attributes.paid.coinreset) {
                    speech += res.strings.LAUNCH_BUSTED_UPSELL;
                    attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
                    handlerInput.responseBuilder
                      .addDirective(utils.getPurchaseDirective(attributes, 'coinreset', 'Upsell', 'subscribe.coinreset.launch',
                        utils.ri(speech, attributes.temp.speechParams)));
                  } else {
                    speech += res.strings.LAUNCH_BUSTED;
                    attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
                    handlerInput.responseBuilder
                      .speak(utils.ri(speech, attributes.temp.speechParams))
                  }
                  response = handlerInput.responseBuilder
                    .withShouldEndSession(true)
                    .getResponse();
                  resolve(response);
                  return;
                } else {
                  speech += res.pickRandomOption(event, attributes, 'LAUNCH_BUSTED_REPLENISH');
                  attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
                  attributes.bankroll += utils.REFRESH_BANKROLL;
                  attributes.busted = undefined;
                  finishResponse();
                }
              });
            }
          } else {
            finishResponse();
          }

          function finishResponse() {
            // Set up the buttons to all flash, welcoming the user to press a button
            buttons.addLaunchAnimation(handlerInput);
            buttons.buildButtonDownAnimationDirective(handlerInput, []);
            buttons.startInputHandler(handlerInput);

            // For a new user, just tell them to bet or say spin (which places a bet)
            if (attributes.newUser) {
              speech = ((buttons.supportButtons(handlerInput))
                ? res.strings.LAUNCH_NEWUSER_BUTTON
                : res.strings.LAUNCH_NEWUSER);
              attributes.temp.speechParams.Greeting = greeting;
              reprompt = res.strings.LAUNCH_NEWUSER_REPROMPT;
              response = handlerInput.responseBuilder
                .speak(utils.ri(speech, attributes.temp.speechParams))
                .reprompt(utils.ri(reprompt, attributes.temp.repromptParams))
                .getResponse();
            } else if (attributes.temp.resumeGame) {
              speech = (buttons.supportButtons(handlerInput))
                ? res.strings.LAUNCH_RESUME_GAME_BUTTON
                : res.strings.LAUNCH_RESUME_GAME;
              attributes.temp.resumeGame = undefined;
              reprompt = res.strings.LAUNCH_RESUME_GAME_REPROMPT;
              response = handlerInput.responseBuilder
                .speak(utils.ri(speech, attributes.temp.speechParams))
                .reprompt(utils.ri(reprompt, attributes.temp.repromptParams))
                .getResponse();
            } else {
              // Read the available games then prompt for each one
              const availableGames = utils.readAvailableGames(event, attributes, true);
              if (availableGames.choices.indexOf('tournament') > -1) {
                speech += res.pickRandomOption(event, attributes, 'LAUNCH_WELCOME_TOURNAMENT');
                attributes.temp.speechParams.Time = utils.getRemainingTournamentTime(handlerInput);
              } else {
                speech += res.pickRandomOption(event, attributes, 'LAUNCH_WELCOME');
                attributes.temp.speechParams.Greeting = greeting;
                if (!buttons.supportButtons(handlerInput)) {
                  speech += availableGames.speech;
                }
              }
              attributes.choices = availableGames.choices;
              attributes.originalChoices = availableGames.choices;

              // Ask for the first one
              speech = '<audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/casinowelcome.mp3\"/> ' + speech;
              reprompt = res.strings.LAUNCH_REPROMPT;
              attributes.temp.repromptParams.Game = utils.sayGame(event, availableGames.choices[0]);

              if (buttons.supportButtons(handlerInput)) {
                speech += res.strings.LAUNCH_WELCOME_BUTTON;
                attributes.temp.speechParams.Game1 = utils.sayGame(event, availableGames.choices[0]);
                attributes.temp.speechParams.Game2 = utils.sayGame(event, availableGames.choices[0]);
              } else {
                speech += reprompt;
                Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);
              }
              response = handlerInput.responseBuilder
                .speak(utils.ri(speech, attributes.temp.speechParams))
                .reprompt(utils.ri(reprompt, attributes.temp.repromptParams))
                .getResponse();
            }
            resolve(response);
          }
        });
      });
    });
  },
};
