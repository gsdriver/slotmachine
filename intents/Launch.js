//
// Handles opening the skill
//

'use strict';

const utils = require('../utils');

module.exports = {
  handleIntent: function() {
    // Tell them the rules, their bankroll and offer a few things they can do
    const res = require('../' + this.event.request.locale + '/resources');
    let speech = res.strings.LAUNCH_WELCOME;

    // Read the available games then prompt for each one
    utils.readAvailableGames(this.event.request.locale, (gameText, choices) => {
      speech += gameText;
      this.attributes.choices = choices;
      this.handler.state = 'SELECTGAME';

      // Ask for the first one
      const reprompt = res.strings.LAUNCH_REPROMPT.replace('{0}', res.sayGame(choices[0]));
      speech += reprompt;
      utils.emitResponse(this.emit, this.event.request.locale, null, null, speech, reprompt);
    });
  },
};
