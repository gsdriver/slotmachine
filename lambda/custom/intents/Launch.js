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
      utils.getPurchasedProducts(handlerInput, (err, result) => {
        if (process.env.TESTCOINS) {
          attributes.paid = {coins: {
            productId: '12',
            state: process.env.TESTCOINS,
          }};
        }

        let speech = '<audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/casinowelcome.mp3\"/> ';
        if (attributes.tournamentResult) {
          speech += attributes.tournamentResult;
          attributes.tournamentResult = undefined;
        }

        // First off - are they out of money?
        if (attributes.busted) {
          if (attributes.paid && attributes.paid.coins && (attributes.paid.coins.state == 'PURCHASED')) {
            speech += res.strings.SUBSCRIPTION_PAID_REPLENISH.replace('{0}', utils.STARTING_BANKROLL);
            attributes.bankroll += utils.STARTING_BANKROLL;
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
              if (!attributes.temp.noUpsell && attributes.paid && attributes.paid.coins) {
                handlerInput.responseBuilder
                  .addDirective(utils.getPurchaseDirective(attributes, 'Upsell',
                    res.strings.LAUNCH_BUSTED_UPSELL.replace('{0}', utils.REFRESH_BANKROLL)));
              } else {
                speech += res.strings.LAUNCH_BUSTED.replace('{0}', utils.REFRESH_BANKROLL);
                handlerInput.responseBuilder
                  .speak(speech);
              }
              handlerInput.responseBuilder.withShouldEndSession(true);
              resolve();
              return;
            } else {
              speech += res.strings.LAUNCH_BUSTED_REPLENISH.replace('{0}', utils.REFRESH_BANKROLL);
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
          handlerInput.responseBuilder
            .speak(res.strings.LAUNCH_NEWUSER)
            .reprompt(res.strings.LAUNCH_NEWUSER_REPROMPT);
        } else {
          speech += res.strings.LAUNCH_WELCOME;

          // Read the available games then prompt for each one
          const availableGames = utils.readAvailableGames(event, attributes, true);
          if (availableGames.choices.indexOf('tournament') > -1) {
            speech = res.strings.LAUNCH_WELCOME_TOURNAMENT
              .replace('{0}', utils.getRemainingTournamentTime(event));
          } else {
            speech += availableGames.speech;
          }
          attributes.choices = availableGames.choices;
          attributes.originalChoices = availableGames.choices;

          // Ask for the first one
          const reprompt = res.strings.LAUNCH_REPROMPT
            .replace('{0}', utils.sayGame(event, availableGames.choices[0]));
          speech += reprompt;
          handlerInput.responseBuilder
            .speak(speech)
            .reprompt(reprompt);
        }
        resolve();
      });
    });
  },
};
