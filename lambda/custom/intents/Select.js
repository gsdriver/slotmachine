//
// Handles selecting a game
//

'use strict';

const utils = require('../utils');

module.exports = {
  handleIntent: function() {
    // Tell them the rules, their bankroll and offer a few things they can do
    let speech;

    // Read the available games then prompt for each one
    this.attributes.temp.readingRules = false;
    utils.readAvailableGames(this, false, (gameText, choices) => {
      speech = gameText;
      this.attributes.choices = choices;
      this.attributes.originalChoices = choices;
      this.handler.state = 'SELECTGAME';

      // Ask for the first one
      const reprompt = this.t('LAUNCH_REPROMPT').replace('{0}', utils.sayGame(this, choices[0]));
      speech += reprompt;
      utils.emitResponse(this, null, null, speech, reprompt);
    });
  },
  handleYesIntent: function() {
    // Great, they picked a game
    this.handler.state = 'INGAME';
    selectedGame(this);
  },
  handleNoIntent: function() {
    // OK, pop this choice and go to the next one - if no other choices, we'll go with the last one
    this.attributes.choices.shift();
    if (this.attributes.choices.length === 1) {
      // OK, we're going with this one
      this.handler.state = 'INGAME';
      selectedGame(this);
    } else {
      const speech = this.t('LAUNCH_REPROMPT').replace('{0}', utils.sayGame(this, this.attributes.choices[0]));

      utils.emitResponse(this, null, null, speech, speech);
    }
  },
  handleBetIntent: function() {
    // They want to bet - so we'll select and bet in one
    this.handler.state = 'INGAME';
    selectedGame(this, true);
  },
};

function selectedGame(context, placeBet) {
  const attributes = context.attributes;
  let speech;

  // Just in case they were trying to play at the last minute...
  if (!context.attributes.temp.tournamentAvailable && (context.attributes.currentGame == 'tournament')) {
    context.attributes.currentGame = 'basic';
    utils.emitResponse(context, null, null, context.t('TOURNAMENT_ENDED'),
        context.t('ERROR_REPROMPT'));
    return;
  }

  // First let's see if they selected an element via touch
  const index = getSelectedIndex(context);
  if ((index !== undefined) && (index >= 0) && (index < attributes.originalChoices.length)) {
    // Use this one instead
    attributes.currentGame = attributes.originalChoices[index];
  } else {
    attributes.currentGame = attributes.choices[0];
  }

  attributes.choices = undefined;
  attributes.originalChoices = undefined;
  speech = context.t('SELECT_WELCOME').replace('{0}', utils.sayGame(context, attributes.currentGame));

  if (!attributes[attributes.currentGame]) {
    attributes[attributes.currentGame] = {
      bankroll: 1000,
      high: 1000,
    };

    // If this is tournament, keep track of number of tournaments played
    if (attributes.currentGame == 'tournament') {
      attributes.tournamentsPlayed = (attributes.tournamentsPlayed + 1) || 1;
    }
  }

  const game = attributes[attributes.currentGame];
  const rules = utils.getGame(attributes.currentGame);
  const reprompt = context.t('SELECT_REPROMPT').replace('{0}', rules.maxCoins);

  if (rules.welcome) {
    speech += context.t(rules.welcome);
  }

  // Check if there is a progressive jackpot
  utils.getProgressivePayout(attributes, (jackpot) => {
    speech += context.t('READ_BANKROLL').replace('{0}', utils.readCoins(context, game.bankroll));

    if (placeBet) {
      if (jackpot) {
        speech += context.t('PROGRESSIVE_JACKPOT_ONLY').replace('{0}', jackpot);
        game.progressiveJackpot = jackpot;
      }
      attributes.partialSpeech = speech;
      context.emitWithState(context.event.request.intent.name);
    } else {
      if (jackpot) {
        // For progressive, just tell them the jackpot and to bet max coins
        speech += context.t('PROGRESSIVE_JACKPOT').replace('{0}', jackpot).replace('{1}', rules.maxCoins);
        game.progressiveJackpot = jackpot;
        utils.emitResponse(context, null, null, speech, reprompt);
      } else {
        speech += reprompt;
        utils.emitResponse(context, null, null, speech, reprompt);
      }
    }
  });
}

function getSelectedIndex(context) {
  let index;

  if (context.event.request.token) {
    const games = context.event.request.token.split('.');
    if (games.length === 2) {
      index = games[1];
    }
  } else {
    // Look for an intent slot
    if (context.event.request.intent.slots && context.event.request.intent.slots.Number
      && context.event.request.intent.slots.Number.value) {
      index = parseInt(context.event.request.intent.slots.Number.value);

      if (isNaN(index)) {
        index = undefined;
      } else {
        // Turn into zero-based index
        index--;
      }
    }
  }

  return index;
}
