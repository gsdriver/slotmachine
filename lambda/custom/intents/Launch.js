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
    let response;

    return new Promise((resolve, reject) => {
      utils.getGreeting(handlerInput, (greeting) => {
        attributes.temp.speechParams.Greeting = greeting;
        utils.getPurchasedProducts(handlerInput, (err, result) => {
          let speech = 'LAUNCH';

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
              speech += '_BUSTED';
              attributes.bankroll += 5;
              attributes.busted = undefined;
              finishResponse();
            } else {
              // Is it the next day or not?
              utils.isNextDay(event, attributes, (nextDay) => {
                if (!nextDay) {
                  new Promise((resolve, reject) => {
                    // Here's the place to do an upsell if we can!
                    if (!attributes.temp.noUpsell && attributes.paid && attributes.paid.coinreset) {
                      speech += '_BUSTED_UPSELL';
                      attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
                      handlerInput.jrm.renderObject(ri(speech, attributes.temp.speechParams)).then((directive) => {
                        directive.payload.InSkillProduct.productId = attributes.paid.coinreset.productId;
                        handlerInput.jrb.addDirective(directive);
                        resolve();
                      });
                    } else {
                      speech += '_BUSTED';
                      attributes.temp.speechParams.Coins = utils.REFRESH_BANKROLL;
                      handlerInput.jrb
                        .speak(ri(speech, attributes.temp.speechParams));
                      resolve();
                    }
                  }).then(() => {
                    response = handlerInput.jrb
                      .withShouldEndSession(true)
                      .getResponse();
                    resolve(response);
                  });
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
              speech = (buttons.supportButtons(handlerInput))
                ? 'LAUNCH_NEWUSER_BUTTON'
                : 'LAUNCH_NEWUSER';
              attributes.temp.speechParams.Greeting = greeting;
              response = handlerInput.jrb
                .speak(ri(speech, attributes.temp.speechParams))
                .reprompt(ri('LAUNCH_NEWUSER_REPROMPT'))
                .getResponse();
              resolve(response);
            } else if (attributes.temp.resumeGame) {
              speech = (buttons.supportButtons(handlerInput))
                ? 'LAUNCH_RESUME_GAME_BUTTON'
                : 'LAUNCH_RESUME_GAME';
              attributes.temp.resumeGame = undefined;
              response = handlerInput.jrb
                .speak(ri(speech, attributes.temp.speechParams))
                .reprompt(ri('LAUNCH_RESUME_GAME_REPROMPT'))
                .getResponse();
              resolve(response);
            } else {
              // Read the available games then prompt for each one
              const availableGames = utils.readAvailableGames(event, attributes, true);
              new Promise((resolve, reject) => {
                if (availableGames.choices.indexOf('tournament') > -1) {
                  speech += '_TOURNAMENT';
                  utils.getRemainingTournamentTime(handlerInput, (text) => {
                    attributes.temp.speechParams.Time = text;
                    resolve();
                  });
                } else {
                  resolve();
                }
              }).then(() => {
                attributes.choices = availableGames.choices;
                attributes.originalChoices = availableGames.choices;

                // Ask for the first one
                attributes.temp.repromptParams.Game =
                  utils.sayGame(event, availableGames.choices[0]);
                if (buttons.supportButtons(handlerInput)) {
                  speech += '_BUTTON';
                  attributes.temp.speechParams.Game1 =
                    utils.sayGame(event, availableGames.choices[0]);
                  attributes.temp.speechParams.Game2 =
                    utils.sayGame(event, availableGames.choices[0]);
                } else {
                  Object.assign(attributes.temp.speechParams, attributes.temp.repromptParams);
                }
                response = handlerInput.jrb
                  .speak(ri(speech, attributes.temp.speechParams))
                  .reprompt(ri('LAUNCH_REPROMPT', attributes.temp.repromptParams))
                  .getResponse();
                resolve(response);
              });
            }
          }
        });
      });
    });
  },
};
