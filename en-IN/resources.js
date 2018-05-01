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
  'LAUNCH_WELCOME_ACHIEVEMENT': 'Welcome back to Slot Machine. You have {0} achievement points. ',
  'LAUNCH_WELCOME_TOURNAMENT': 'Welcome back to Slot Machine. We have a tournament under way for the next {0}. ',
  'LAUNCH_NEWUSER': 'Welcome to Slot Machine. Say spin to pull the handle.',
  'LAUNCH_NEWUSER_REPROMPT': 'Say spin to pull the handle.',
  // Select.js
  'SELECT_WELCOME': 'Welcome to {0}. ',
  'SELECT_REPROMPT': 'You can bet up to {0} coins or say read high scores to hear the leader board.',
  // From Exit.js
  'EXIT_GAME': '{0} Goodbye.',
  'EXIT_TOURNAMENT_TODAY': 'Thanks for playing! Come back between 6 and 7 PM Pacific Time for the slot machine tournament!',
  'EXIT_TOURNAMENT_SOON': 'Thanks for playing! Come back on Wednesday from 6 to 7 PM Pacific Time for the slot machine tournament!',
  // From HighScore.js
  'HIGHSCORE_REPROMPT': 'What else can I help you with?',
  // From Bet.js
  'BET_INVALID_AMOUNT': 'I\'m sorry, {0} is not a valid amount to bet.',
  'BET_INVALID_REPROMPT': 'What else can I help you with?',
  'BET_EXCEEDS_MAX': 'Sorry, this bet exceeds the maximum bet of {0}.',
  'BET_EXCEEDS_BANKROLL': 'Sorry, this bet exceeds your bankroll of {0}.',
  'BET_PLACED': 'You bet {0}. ',
  'BET_PLACED_REPROMPT': 'Say spin to pull the handle.',
  // From Help.js
  'HELP_TOURNAMENT': 'There are {0} left in tournament play. At the end of the tournament the highest bankroll will win 100 achievement points. ',
  'HELP_COMMANDS': 'Say bet to insert coins <break time=\"200ms\"/> spin to pull the handle <break time=\"200ms\"/> read high scores to hear the leader board <break time=\"200ms\"/> or select a new machine to change to a different machine. ',
  'HELP_REPROMPT': 'Check the Alexa companion app for the payout table.',
  'HELP_CARD_TITLE': 'Payout Table',
  'HELP_SELECT_TEXT': 'Say yes to select the offered machine, or no for a different machine. ',
  'HELP_ACHIEVEMENT_POINTS': 'You earn 10 points per game each day you play <break time=\'200ms\'/> 25 points for each payout of 50 to 1 or more <break time=\'200ms\'/> 100 points for each tournament win <break time=\'200ms\'/> N points for each streak of N wins in a row. ',
  'HELP_ACHIEVEMENT_CARD_TEXT': '\nYou earn achievement points as you play which is how the high score board is determined. You earn points as follows:\n - 10 achievement points per game each day you play \n - 25 points for each payout of 50 to 1 or more\n - 100 points for each tournament win \n - N points for each streak of N wins in a row.\n',
  // From Rules.js
  'RULES_REPROMPT': 'Say bet to insert coins or spin to pull the handle.',
  'RULES_SELECT_REPROMPT': 'Say yes to play this game or no to hear the next option.',
  'RULES_CARD_TITLE': 'Payout Table',
  // From Spin.js
  'SPIN_NOBETS': 'Sorry, you have to place a bet before you can pull the handle.',
  'SPIN_INVALID_REPROMPT': 'Place a bet',
  'SPIN_CANTBET_LASTBETS': 'Sorry, your bankroll of {0} can\'t support your last set of bets.',
  'SPIN_RESULT': ' {0}. ',
  'SPIN_PROGRESSIVE_WINNER': 'You hit the progressive jackpot and won {0}! ',
  'SPIN_WINNER': 'You matched {0} and won {1}. ',
  'SPIN_LOSER': 'Sorry, you lost. ',
  'SPIN_PLAY_AGAIN': 'Would you like to spin again?',
  'SPIN_BUSTED': 'You lost all your money. Resetting to 1000 coins and clearing your bet. ',
  'SPIN_BUSTED_REPROMPT': 'Place a bet.',
  'SPIN_OUTOFMONEY': 'You are out of coins and out of the tournament. Better luck next week! ',
  'SPIN_JACKPOT_ACHIEVEMENT': 'You earned 25 achievement points for a jackpot. ',
  'SPIN_FIRSTPLAY_ACHIEVEMENT': 'You earned 10 achievement points for your first time playing {0} today. ',
  'SPIN_STREAK_ACHIEVEMENT': 'You earned {0} achievement points for {1} wins in a row. ',
  'SPIN_NEWUSER': 'If you would like to try a different machine, say change machine or say spin to spin again. ',
  // From utils.js
  'ERROR_REPROMPT': 'What else can I help with?',
  'ANY_SLOT': 'any',
  'PAYOUT_PAYS': 'pays {0} coins.',
  'PAYOUT_PROGRESSIVE': 'pays the progessive jackpot.',
  'LEADER_RANKING': 'You have {0} achievement points ranking you as <say-as interpret-as="ordinal">{1}</say-as> of {2} players. ',
  'LEADER_GAME_RANKING': 'Your current bankroll of {0} coins on {1} ranks you as <say-as interpret-as="ordinal">{2}</say-as> of {3} players. ',
  'LEADER_NO_SCORES': 'Sorry, I\'m unable to read the current leader board. ',
  'LEADER_FORMAT': '{0} achievement points',
  'LEADER_GAME_FORMAT': '{0} coins',
  'LEADER_TOP_SCORES': 'The top {0} scores are {1}. ',
  'AVAILABLE_GAMES': 'We have {0} different games <break time=\"200ms\"/> ',
  'WILD_SPECIAL': 'Cherries are wild. ',
  'HIGH_JACKPOT': 'Today\'s tournament features a 1000 to 1 maximum payout! ',
  'HIGH_PAYOUT': 'Today\'s tournament machine pays out at 110%! ',
  'STANDARD_MEAT': 'Today\'s tournament is the standard meat game. ',
  'PROGRESSIVE_SPECIAL': 'Diamond diamond diamond wins the progressive jackpot when the maximum number of coins are played. ',
  'SELECT_GAME': 'Select a game to play',
  'DISPLAY_PAYOUT_WINNER': 'You won {0} coins',
  'DISPLAY_PAYOUT_LOSER': 'Sorry, you lost',
  'TOURNAMENT_WINNER': 'Congratulations, you won the tournament with {0} coins! ',
  'TOURNAMENT_LOSER': 'Sorry, you didn\'t win the tournament. The high score was {0} coins and you had {1} coins. ',
  'TOURNAMENT_TIMELEFT_MINUTES': '{0} minutes',
  'TOURNAMENT_TIMELEFT_MINUTES_AND_SECONDS': '{0} minutes and {1} seconds',
  'TOURNAMENT_TIMELEFT_SECONDS': '{0} seconds',
  // General
  'SINGLE_COIN': 'coin',
  'PLURAL_COIN': 'coins',
  'READ_BANKROLL': 'You have {0}. ',
  'PROGRESSIVE_JACKPOT_ONLY': 'The progressive jackpot is currently {0} coins. ',
  'PROGRESSIVE_JACKPOT': 'The progressive jackpot is currently {0} coins. Bet {1} coins to win the progressive jackpot. ',
  'TOURNAMENT_ENDED': 'The tournament has ended. Please check again later to hear the results! ',
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
      'any gold bar': 'any gold bar',
      'bell': 'bell',
      'heart': 'heart',
      'horseshoe': 'horseshoe',
      'gold bar': 'gold bar',
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
      'loose': 'the 105% payout game',
      'progressive': 'progressive jackpot',
      'tournament': 'the tournament round',
      'steak': 'the meat game'};

    return (gameMap[game]) ? gameMap[game] : game;
  },
};
