//
// Handles selecting a game
//

'use strict';

const utils = require('../utils');

module.exports = {
  handleIntent: function() {
    // Tell them the rules, their bankroll and offer a few things they can do
    const res = require('../' + this.event.request.locale + '/resources');
    let speech;

    // Read the available games then prompt for each one
    utils.readAvailableGames(this.event.request.locale,
        this.attributes.currentGame, false, (gameText, choices) => {
      speech = gameText;
      this.attributes.choices = choices;
      this.handler.state = 'SELECTGAME';

      // Ask for the first one
      const reprompt = res.strings.LAUNCH_REPROMPT.replace('{0}', res.sayGame(choices[0]));
      speech += reprompt;
      utils.emitResponse(this.emit, this.event.request.locale, null, null, speech, reprompt);
    });
  },
  handleYesIntent: function() {
    // Great, they picked a game
    this.handler.state = 'INGAME';
    selectedGame(this.emit, this.event, this.attributes);
  },
  handleNoIntent: function() {
    // OK, pop this choice and go to the next one - if no other choices, we'll go with the last one
    this.attributes.choices.shift();
    if (this.attributes.choices.length === 1) {
      // OK, we're going with this one
      this.handler.state = 'INGAME';
      selectedGame(this.emit, this.event, this.attributes);
    } else {
      const res = require('../' + this.event.request.locale + '/resources');
      const speech = res.strings.LAUNCH_REPROMPT.replace('{0}', res.sayGame(this.attributes.choices[0]));

      utils.emitResponse(this.emit, this.event.request.locale, null, null, speech, speech);
    }
  },
  handleBetIntent: function() {
    // They want to bet - so we'll select and bet in one
    this.handler.state = 'INGAME';
    selectedGame(this.emit, this.event, this.attributes, this.emitWithState, true);
  },
};

function selectedGame(emit, event, attributes, emitWithState, placeBet) {
  const res = require('../' + event.request.locale + '/resources');
  let speech;

  // Great, they picked a game
  attributes.currentGame = attributes.choices[0];
  attributes.choices = undefined;
  speech = res.strings.SELECT_WELCOME.replace('{0}', res.sayGame(attributes.currentGame));

  if (!attributes[attributes.currentGame]) {
    attributes[attributes.currentGame] = {
      bankroll: 1000,
      high: 1000,
    };
  }

  const game = attributes[attributes.currentGame];
  const rules = utils.getGame(attributes.currentGame);
  const reprompt = res.strings.SELECT_REPROMPT.replace('{0}', rules.maxCoins);

  // Check if there is a progressive jackpot
  utils.getProgressivePayout(attributes, (jackpot) => {
    speech += res.strings.READ_BANKROLL.replace('{0}', utils.readCoins(event.request.locale, game.bankroll));

    if (placeBet) {
      if (jackpot) {
        speech += res.strings.PROGRESSIVE_JACKPOT_ONLY.replace('{0}', jackpot);
        game.progressiveJackpot = jackpot;
      }
      attributes.partialSpeech = speech;
      emitWithState(event.request.intent.name);
    } else {
      if (jackpot) {
        // For progressive, just tell them the jackpot and to bet max coins
        speech += res.strings.PROGRESSIVE_JACKPOT.replace('{0}', jackpot).replace('{1}', rules.maxCoins);
        game.progressiveJackpot = jackpot;
        utils.emitResponse(emit, event.request.locale, null, null, speech, reprompt);
      } else {
        speech += reprompt;
        utils.emitResponse(emit, event.request.locale, null, null, speech, reprompt);
      }
    }
  });
}
