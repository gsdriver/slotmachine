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

    return new Promise((resolve, reject) => {
      let response;
      utils.getPurchasedProducts(handlerInput, (err, result) => {
        let speech = '';
        if (attributes.tournamentResult) {
          speech += attributes.tournamentResult;
          attributes.tournamentResult = undefined;
        }

        // First off - are they out of money?
        if (attributes.busted) {
          if (attributes.paid && attributes.paid.resetcoins && (attributes.paid.resetcoins.state == 'PURCHASED')) {
            speech += res.strings.SUBSCRIPTION_PAID_REPLENISH.replace('{0}', utils.STARTING_BANKROLL);
            attributes.bankroll += utils.STARTING_BANKROLL;
            attributes.busted = undefined;
          } else if (attributes.temp.tournamentAvailable) {
            // If the tournament is available, we'll throw 5 coins at you to play
            speech += res.strings.LAUNCH_BUSTED_TOURNAMENT;
            attributes.bankroll += 5;
            attributes.busted = undefined;
          } else {
            // Is it the next day or not?
            let nextDay = false;
            const now = Date.now();

            if ((now - attributes.busted) > 24*60*60*1000) {
              nextDay = true;
            } else {
              // Convert to PST to see if it's next day
              const d = new Date(now);
              const b = new Date(attributes.busted);
              d.setHours(d.getHours() - 7);
              b.setHours(b.getHours() - 7);
              nextDay = (b.getDay() !== d.getDay());
            }

            if (!nextDay) {
              // Here's the place to do an upsell if we can!
              if (!attributes.temp.noUpsell && attributes.paid && attributes.paid.resetcoins) {
                handlerInput.responseBuilder
                  .addDirective(utils.getPurchaseDirective(attributes, 'Upsell',
                    speech + res.strings.LAUNCH_BUSTED_UPSELL.replace('{0}', utils.REFRESH_BANKROLL)));
              } else {
                speech += res.strings.LAUNCH_BUSTED.replace('{0}', utils.REFRESH_BANKROLL);
                handlerInput.responseBuilder
                  .speak(speech);
              }
              response = handlerInput.responseBuilder
                .withShouldEndSession(true)
                .getResponse();
              resolve(response);
              return;
            } else {
              speech += res.pickRandomOption(event, attributes, 'LAUNCH_BUSTED_REPLENISH')
                  .replace('{0}', utils.REFRESH_BANKROLL);
              attributes.bankroll += utils.REFRESH_BANKROLL;
              attributes.busted = undefined;
            }
          }
        }

        // Set up the buttons to all flash, welcoming the user to press a button
        buttons.addLaunchAnimation(handlerInput);
        buttons.buildButtonDownAnimationDirective(handlerInput, []);
        buttons.startInputHandler(handlerInput);

        // For a new user, just tell them to bet or say spin (which places a bet)
        if (attributes.newUser) {
          speech = (buttons.supportButtons(handlerInput))
            ? res.strings.LAUNCH_NEWUSER_BUTTON
            : res.strings.LAUNCH_NEWUSER;
          response = handlerInput.responseBuilder
            .speak(speech)
            .reprompt(res.strings.LAUNCH_NEWUSER_REPROMPT)
            .getResponse();
        } else if (attributes.temp.resumeGame) {
          speech = (buttons.supportButtons(handlerInput))
            ? res.strings.LAUNCH_RESUME_GAME_BUTTON
            : res.strings.LAUNCH_RESUME_GAME;
          attributes.temp.resumeGame = undefined;
          response = handlerInput.responseBuilder
            .speak(res.strings.LAUNCH_RESUME_GAME)
            .reprompt(res.strings.LAUNCH_RESUME_GAME_REPROMPT)
            .getResponse();
        } else {
          // Read the available games then prompt for each one
          const availableGames = utils.readAvailableGames(event, attributes, true);
          if (availableGames.choices.indexOf('tournament') > -1) {
            speech += res.pickRandomOption(event, attributes, 'LAUNCH_WELCOME_TOURNAMENT')
              .replace('{0}', utils.getRemainingTournamentTime(event));
          } else {
            speech += res.pickRandomOption(event, attributes, 'LAUNCH_WELCOME');
            if (!buttons.supportButtons(handlerInput)) {
              speech += availableGames.speech;
            }
          }
          attributes.choices = availableGames.choices;
          attributes.originalChoices = availableGames.choices;

          // Ask for the first one
          speech = '<audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/casinowelcome.mp3\"/> ' + speech;
          const reprompt = res.strings.LAUNCH_REPROMPT
            .replace('{0}', utils.sayGame(event, availableGames.choices[0]));

          if (buttons.supportButtons(handlerInput)) {
            speech += res.strings.LAUNCH_WELCOME_BUTTON
              .replace('{0}', utils.sayGame(event, availableGames.choices[0]))
              .replace('{1}', utils.sayGame(event, availableGames.choices[0]));
          } else {
            speech += reprompt;
          }
          response = handlerInput.responseBuilder
            .speak(speech)
            .reprompt(reprompt)
            .getResponse();
        }
        resolve(response);
      });
    });
  },
};
