//
// Localized resources
//

const resources = {
  // From index.js
  'UNKNOWN_INTENT': 'Sorry, I didn\'t get that. Try saying Bet.',
  'UNKNOWN_INTENT_REPROMPT': 'Try saying Bet.',
  // Launch.js
  'LAUNCH_REPROMPT': 'You can place a bet by saying bet a coin.',
  'LAUNCH_WELCOME': 'Welcome to Slot Machine. ',
  // From Exit.js
  'EXIT_GAME': '{0} Goodbye.',
  // From Bet.js
  'BET_INVALID_AMOUNT': 'I\'m sorry, {0} is not a valid amount to bet.',
  'BET_INVALID_REPROMPT': 'What else can I help you with?',
  'BET_EXCEEDS_MAX': 'Sorry, this bet exceeds the maximum bet of {0}.',
  'BET_EXCEEDS_BANKROLL': 'Sorry, this bet exceeds your bankroll of {0}.',
  'BET_PLACED': 'You bet {0}. ',
  'BET_PLACED_REPROMPT': 'Say spin to pull the handle.',
  // From utils.js
  'ERROR_REPROMPT': 'What else can I help with?',
  // General
  'SINGLE_COIN': 'coin',
  'PLURAL_COIN': 'coins',
  'READ_BANKROLL': 'You have {0}. ',
};

module.exports = {
  strings: resources,
};
