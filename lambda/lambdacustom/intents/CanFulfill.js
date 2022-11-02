//
// Checks whether we can fulfill this intent
// Note that this is processed outside of the normal Alexa SDK
// So we cannot use alexa-sdk functionality here
//

'use strict';

module.exports = {
  check: function(event) {
    // We ignore the intent when the user launches the skill
    // so we can fulfill pretty much anything
    const universalIntents = ['HighScoreIntent', 'AMAZON.FallbackIntent', 'BetIntent',
      'ElementSelected', 'GameIntent', 'SpinIntent', 'RulesIntent', 'SelectIntent',
      'AMAZON.HelpIntent', 'AMAZON.YesIntent', 'AMAZON.NoIntent', 'AMAZON.StopIntent',
      'AMAZON.CancelIntent', 'AMAZON.NextIntent'];

    // Default to a negative response
    const response = {
      'version': '1.0',
      'response': {
        'canFulfillIntent': {
          'canFulfill': 'NO',
          'slots': {},
        },
      },
    };

    if (universalIntents.indexOf(event.request.intent.name) > -1) {
      // We can fulfill it - all slots are good
      let slot;

      response.response.canFulfillIntent.canFulfill = 'YES';
      for (slot in event.request.intent.slots) {
        if (slot) {
          response.response.canFulfillIntent.slots[slot] =
              {'canUnderstand': 'YES', 'canFulfill': 'YES'};
        }
      }
    }

    console.log('CanFulfill: ' + JSON.stringify(response));
    return response;
  },
};
