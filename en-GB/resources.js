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
  // From Help.js
  'HELP_COMMANDS': 'Say bet to insert a coin or spin to pull the handle. ',
  'HELP_REPROMPT': 'Check the Alexa companion app for the payout table.',
  'HELP_CARD_TITLE': 'Payout Table',
  // From Rules.js
  'RULES_REPROMPT': 'Say bet to insert a coin or spin to pull the handle.',
  'RULES_CARD_TITLE': 'Payout Table',
  // From Spin.js
  'SPIN_NOBETS': 'Sorry, you have to place a bet before you can pull the handle.',
  'SPIN_INVALID_REPROMPT': 'Place a bet',
  'SPIN_CANTBET_LASTBETS': 'Sorry, your bankroll of {0} can\'t support your last set of bets.',
  'SPIN_RESULT': ' {0}. ',
  'SPIN_WINNER': 'You matched {0} and won {1}. ',
  'SPIN_LOSER': 'Sorry, you lost. ',
  'SPIN_PLAY_AGAIN': 'Would you like to spin again?',
  'SPIN_BUSTED': 'You lost all your money. Resetting to 1000 coins and clearing your bet. ',
  'SPIN_BUSTED_REPROMPT': 'Place a bet.',
  // From utils.js
  'ERROR_REPROMPT': 'What else can I help with?',
  'ANY_SLOT': 'any',
  'PAYOUT_PAYS': 'pays {0} coins.',
  // General
  'SINGLE_COIN': 'coin',
  'PLURAL_COIN': 'coins',
  'READ_BANKROLL': 'You have {0}. ',
};

module.exports = {
  strings: resources,
  saySymbol: function(symbol) {
    const symbolMap = {'cherry': 'cherry',
      'lemon': 'lemon',
      'orange': 'orange',
      'plum': 'plum',
      'bar': 'bar'};

    return (symbolMap[symbol]) ? symbolMap[symbol] : symbol;
  },
};
