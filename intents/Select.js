//
// Handles selecting a game
//

'use strict';

const utils = require('../utils');

module.exports = {
  handleYesIntent: function() {
    // Great, they picked a game
    this.handler.state = 'INGAME';
    selectedGame(this.emit, this.event.request.locale, this.attributes);
  },
  handleNoIntent: function() {
    // OK, pop this choice and go to the next one - if no other choices, we'll go with the last one
    this.attributes.choices.shift();
    if (this.attributes.choices.length === 1) {
      // OK, we're going with this one
      this.handler.state = 'INGAME';
      selectedGame(this.emit, this.event.request.locale, this.attributes);
    } else {
      const res = require('../' + this.event.request.locale + '/resources');
      const speech = res.strings.LAUNCH_REPROMPT.replace('{0}', res.sayGame(this.attributes.choices[0]));

      utils.emitResponse(this.emit, this.event.request.locale, null, null, speech, speech);
    }
  },
};

function selectedGame(emit, locale, attributes) {
  const res = require('../' + locale + '/resources');
  let speech;
  const reprompt = res.strings.SELECT_REPROMPT;

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

  speech += res.strings.READ_BANKROLL.replace('{0}', utils.readCoins(locale, game.bankroll));
  utils.readRank(locale, attributes, (err, rank) => {
    // Let them know their current rank
    if (rank) {
      speech += rank;
    }

    speech += reprompt;
    utils.emitResponse(emit, locale, null, null, speech, reprompt);
  });
}
