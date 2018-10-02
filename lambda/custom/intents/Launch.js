//
// Handles opening the skill
//

'use strict';

const utils = require('../utils');
const buttons = require('../buttons');
const ri = require('@jargon/alexa-skill-sdk').ri;

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
          let speech = 'LAUNCH';
          let reprompt;

          attributes.temp.speechParams.TournamentResult = (attributes.tournamentResult)
            ? attributes.tournamentResult : '';

          // First off - are they out of money?
          if (attributes.busted) {
            if (attributes.paid && attributes.paid.coinreset && (attributes.paid.coinreset.state == 'PURCHASED')) {
              speech += '_BUSTED_SUBSCRIBED';
              attributes.temp.speechParams.Coins = utils.STARTING_BANKROLL;
              attributes.bankroll += utils.STARTING_BANKROLL;
              attributes.busted = undefined;
              finishResponse();
            } else if (attributes.temp.tournamentAvailable) {
              // If the tournament is available, we'll throw 5 coins at you to play
              speech += '_BUSTED_TOURNAMENT';
              attributes.bankroll += 5;
              attributes.busted = undefined;
              finishResponse();
            } else {
              // Is it the next day or not?
              utils.isNextDay(event, attributes, (nextDay) => {
                if (!nextDay) {
                  // Here's the place to do an upsell if we can!
                  if (!attributes.temp.noUpsell && attributes.paid && attributes.paid.coinreset) {
                    speech += '_BUSTED_UPSELL';
                    attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
                    handlerInput.jrb
                      .addDirective(utils.getPurchaseDirective(attributes, 'coinreset', 'Upsell', 'subscribe.coinreset.launch',
                        ri(speech, attributes.temp.speechParams)));
                  } else {
                    speech += '_BUSTED';
                    attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
                    handlerInput.jrb
                      .speak(ri(speech, attributes.temp.speechParams));
                  }
                  response = handlerInput.responseBuilder
                    .withShouldEndSession(true)
                    .getResponse();
                  resolve(response);
                  return;
                } else {
                  speech += '_BUSTED_REPLENISH';
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
                ? 'LAUNCH_NEWUSER_BUTTON'
                : 'LAUNCH_NEWUSER';
              attributes.temp.speechParams.Greeting = greeting;
              response = handlerInput.jrb
                .speak(ri(speech, attributes.temp.speechParams))
                .reprompt(ri('LAUNCH_NEWUSER_REPROMPT'))
                .getResponse();
            } else if (attributes.temp.resumeGame) {
              speech = (buttons.supportButtons(handlerInput))
                ? 'LAUNCH_RESUME_GAME_BUTTON'
                : 'LAUNCH_RESUME_GAME';
              attributes.temp.resumeGame = undefined;
              response = handlerInput.jrb
                .speak(ri(speech, attributes.temp.speechParams))
                .reprompt(ri('LAUNCH_RESUME_GAME_REPROMPT'))
                .getResponse();
            } else {
              // Read the available games then prompt for each one
              const availableGames = utils.readAvailableGames(event, attributes, true);
              if (availableGames.choices.indexOf('tournament') > -1) {
                speech += '_TOURNAMENT';
                speech += utils.pickRandomOption(event, attributes, 'LAUNCH_WELCOME_TOURNAMENT');
                attributes.temp.speechParams.Time = utils.getRemainingTournamentTime(handlerInput);
              } else {
                speech += utils.pickRandomOption(event, attributes, 'LAUNCH_WELCOME');
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
                speech += '_BUTTON';
                speech += res.strings.LAUNCH_WELCOME_BUTTON;
                attributes.temp.speechParams.Game1 =
                  utils.sayGame(event, availableGames.choices[0]);
                attributes.temp.speechParams.Game2 =
                  utils.sayGame(event, availableGames.choices[0]);
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
