//
// Localized resources
//

const resources = {
  // From index.js
  'UNKNOWN_INTENT': 'Sorry, I didn\'t get that. Try saying Bet.',
  'UNKNOWN_INTENT_REPROMPT': 'Try saying Bet.',
  'UNKNOWN_SELECT_INTENT': 'Sorry, I didn\'t get that. Try saying Yes.',
  'UNKNOWN_SELECT_INTENT_REPROMPT': 'Try saying Yes.',
  // Launch.js
  'LAUNCH_REPROMPT': 'Would you like to play {0}? ',
  'LAUNCH_WELCOME': 'Welcome to Slot Machine. ',
  // Select.js
  'SELECT_WELCOME': 'Welcome to {0}. ',
  'SELECT_REPROMPT': 'You can bet up to {0} coins.',
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
  'HELP_COMMANDS': 'Say bet to insert coins, or spin to pull the handle, or select a new machine to change to a different machine. ',
  'HELP_REPROMPT': 'Check the Alexa companion app for the payout table.',
  'HELP_CARD_TITLE': 'Payout Table',
  'HELP_SELECT_TEXT': 'Say yes to select the offered machine, or no for a different machine. ',
  // From Rules.js
  'RULES_REPROMPT': 'Say bet to insert coins or spin to pull the handle.',
  'RULES_CARD_TITLE': 'Payout Table',
  // From Spin.js
  'SPIN_NOBETS': 'Sorry, you have to place a bet before you can pull the handle.',
  'SPIN_INVALID_REPROMPT': 'Place a bet',
  'SPIN_CANTBET_LASTBETS': 'Sorry, your bankroll of {0} can\'t support your last set of bets.',
  'SPIN_RESULT': ' {0}. ',
  'SPIN_WINNER': 'You matched {0} and won {1}. ',
  'SPIN_PROGRESSIVE_WINNER': 'You hit the progressive jackpot and won {0}! ',
  'SPIN_LOSER': 'Sorry, you lost. ',
  'SPIN_PLAY_AGAIN': 'Would you like to spin again?',
  'SPIN_BUSTED': 'You lost all your money. Resetting to 1000 coins and clearing your bet. ',
  'SPIN_BUSTED_REPROMPT': 'Place a bet.',
  // From utils.js
  'ERROR_REPROMPT': 'What else can I help with?',
  'ANY_SLOT': 'any',
  'PAYOUT_PAYS': 'pays {0} coins.',
  'PAYOUT_PROGRESSIVE': 'pays the progessive jackpot.',
  'RANK_TOGO': 'You are {0} from <say-as interpret-as="ordinal">{1}</say-as> place. ',
  'RANK_POSITION': 'Your high score of {0} coins ranks <say-as interpret-as="ordinal">{1}</say-as> of {2} players. ',
  'RANK_NUMPLAYERS': 'There are {0} players. ',
  'AVAILABLE_GAMES': 'We have {0} different games <break time=\"200ms\"/> ',
  'WILD_SPECIAL': 'Cherries are wild. ',
  'PROGRESSIVE_SPECIAL': 'Diamond diamond diamond wins the progressive jackpot when the maximum number of coins are played. ',
  // General
  'SINGLE_COIN': 'coin',
  'PLURAL_COIN': 'coins',
  'READ_BANKROLL': 'You have {0}. ',
  'PROGRESSIVE_JACKPOT': 'The progressive jackpot is currently {0} coins. Bet {1} coins to win the progressive jackpot. ',
};

module.exports = {
  strings: resources,
  saySymbol: function(symbol) {
    const symbolMap = {'cherry': 'cherry',
      'lemon': 'lemon',
      'orange': 'orange',
      'plum': 'plum',
      'bar': 'bar',
      'blank': 'blank',
      'double bar': 'double bar',
      'seven': 'seven',
      'any bar': 'any bar',
      'bell': 'bell',
      'diamond': 'diamond',
      'chicken': 'chicken',
      'pork': 'pork',
      'veal': 'veal',
      'turkey': 'turkey',
      'steak': 'steak'};

    return (symbolMap[symbol]) ? symbolMap[symbol] : symbol;
  },
  sayGame: function(game) {
    const gameMap = {'basic': 'the standard fruit game',
      'wild': 'wild cherry',
      'progressive': 'progressive jackpot',
      'steak': 'the meat game'};

    return (gameMap[game]) ? gameMap[game] : game;
  },
};
