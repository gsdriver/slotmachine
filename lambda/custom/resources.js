// Localized resources

const resources = {
  'en-US': {
    'translation': {
      // From index.js
      'UNKNOWN_INTENT': 'Sorry, I didn\'t get that. Try saying Spin.',
      'UNKNOWN_INTENT_REPROMPT': 'Try saying Spin.',
      'UNKNOWN_SELECT_INTENT': 'Sorry, I didn\'t get that. Try saying Yes.',
      'UNKNOWN_SELECT_INTENT_REPROMPT': 'Try saying Yes.',
      // Launch.js
      'LAUNCH_REPROMPT': 'Would you like to play {0}? ',
      'LAUNCH_WELCOME': 'Welcome to Slot Machine. ',
      'LAUNCH_WELCOME_TOURNAMENT': 'Welcome back to Slot Machine. We have a tournament under way for the next {0}. ',
      'LAUNCH_NEWUSER': 'Welcome to Slot Machine. Say spin to pull the handle.',
      'LAUNCH_NEWUSER_REPROMPT': 'Say spin to pull the handle.',
      'LAUNCH_BUSTED': 'You are out of coins. Come back tomorrow for {0} more coins. ',
      'LAUNCH_BUSTED_UPSELL': 'You are out of coins. Come back tomorrow for {0} more coins or buy a subscription to reset your bankroll whenever you go bust. ',
      'LAUNCH_BUSTED_REPLENISH': 'Thanks for coming back! Here are {0} coins to get you back in the game. ',
      'SUBSCRIPTION_PAID_REPLENISH': 'Thanks to your Reset Bankroll subscription, your bankroll is reset to {0} coins. ',
      // From Purchase.js
      'PURCHASE_RESETBANKROLL': 'We have a Reset Bankroll subscription available for purchase. Would you like to buy it? ',
      'PURCHASE_CONFIRM_REPROMPT': 'Say yes to buy Reset Bankroll',
      'PURCHASE_NO_PURCHASE': 'What else can I help you with?',
      // From Refund.js
      'REFUND_RESETBANKROLL': 'OK, as a reminder you will need to wait a day to receive additional coins when you lose all your coins. Would you like to cancel your Reset Bankroll subscription? ',
      'REFUND_CONFIRM_REPROMPT': 'Would you like to refund Reset Bankroll?',
      'REFUND_NO_REFUND': 'What else can I help you with?',
      // Select.js
      'SELECT_WELCOME': 'Welcome to {0}. ',
      'SELECT_REPROMPT': 'You can bet up to {0} coins or say read high scores to hear the leader board.',
      // From Exit.js
      'EXIT_GAME': '{0} Goodbye.',
      'EXIT_TOURNAMENT_TODAY': 'Thanks for playing! Come back between 6 and 7 PM Pacific Time for the slot machine tournament!',
      'EXIT_TOURNAMENT_SOON': 'Thanks for playing! Come back on Wednesday from 6 to 7 PM Pacific Time for the slot machine tournament!',
      // From HighScore.js
      'HIGHSCORE_REPROMPT': 'What else can I help you with?',
      // From Help.js
      'HELP_TOURNAMENT': 'There are {0} left in tournament play. At the end of the tournament the highest bankroll will win {1} coins. ',
      'HELP_COMMANDS': 'Say bet to insert coins <break time=\"200ms\"/> spin to pull the handle <break time=\"200ms\"/> read high scores to hear the leader board <break time=\"200ms\"/> or select a new machine to change to a different machine. ',
      'HELP_REPROMPT': 'Check the Alexa companion app for the payout table.',
      'HELP_CARD_TITLE': 'Payout Table',
      'HELP_SELECT_TEXT': 'Say yes to select the offered machine, or no for a different machine. ',
      // From Rules.js
      'RULES_REPROMPT': 'Say bet to insert coins or spin to pull the handle.',
      'RULES_SELECT_REPROMPT': 'Say yes to play this game or no to hear the next option.',
      'RULES_CARD_TITLE': 'Payout Table',
      // From Spin.js
      'SPIN_YOU_BET': 'You bet {0}. ',
      'SPIN_RESULT': ' {0}. ',
      'SPIN_PROGRESSIVE_WINNER': 'You hit the progressive jackpot and won {0}! ',
      'SPIN_WINNER': 'You matched {0} and won {1}. ',
      'SPIN_LOSER': 'Sorry, you lost. ',
      'SPIN_PLAY_AGAIN': 'Would you like to spin again?',
      'SPIN_BUSTED': 'You lost all your money. Come back tomorrow for {0} coins. ',
      'SPIN_OUTOFMONEY': 'You are out of coins and out of the tournament. Better luck next week! ',
      'SPIN_NEWUSER': 'If you would like to try a different machine, say change machine or say spin to spin again. ',
      // From utils.js
      'ERROR_REPROMPT': 'What else can I help with?',
      'ANY_SLOT': 'any',
      'PAYOUT_PAYS': 'pays {0} coins.',
      'PAYOUT_PROGRESSIVE': 'pays the progessive jackpot.',
      'LEADER_RANKING': 'You current bankroll of {0} coins ranks you as <say-as interpret-as="ordinal">{1}</say-as> of {2} players. ',
      'LEADER_GAME_RANKING': 'Your current bankroll of {0} coins on {3} ranks you as <say-as interpret-as="ordinal">{2}</say-as> of {2} players. ',
      'LEADER_NO_SCORES': 'Sorry, I\'m unable to read the current leader board. ',
      'LEADER_FORMAT': '{0} coins',
      'LEADER_TOP_SCORES': 'The top {0} scores are {1}. ',
      'AVAILABLE_GAMES': 'We have {0} different games <break time=\"200ms\"/> ',
      'WILD_SPECIAL': 'Cherries are wild. ',
      'PITY_PAYOUT': 'Every spin not mentioned wins 1 coin when 5 coins are played. ',
      'HIGH_JACKPOT': 'Today\'s tournament features a 1000 to 1 maximum payout! ',
      'HIGH_PAYOUT': 'Today\'s tournament machine pays out at 110%! ',
      'STANDARD_MEAT': 'Today\'s tournament is the standard meat game. ',
      'EVERYONE_WINS': 'On today\'s tournament machine every spin wins when 5 coins are played. ',
      'SIMPSON_GAME': 'Today\'s tournament machine is <audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/simpsons.mp3\"/> ',
      'BATMAN_GAME': 'Today\'s tournament machine is <audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/batman.mp3\"/> ',
      'PROGRESSIVE_SPECIAL': 'Diamond diamond diamond wins the progressive jackpot when the maximum number of coins are played. ',
      'SELECT_GAME': 'Select a game to play',
      'DISPLAY_PAYOUT_WINNER': 'You won {0} coins',
      'DISPLAY_PAYOUT_LOSER': 'Sorry, you lost',
      'TOURNAMENT_WINNER': 'Congratulations, you won the tournament with {0} coins!  You win {1} coins for your tournament win! ',
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
      'GAME_LIST': '{"basic": "the standard fruit game","wild": "wild cherry","loose": "the 105% payout game","progressive": "progressive jackpot","tournament": "the tournament round","steak": "the meat game"}',
      'SYMBOL_LIST': '{"cherry": "cherry","lemon": "lemon","orange": "orange","plum": "plum","bar": "bar","blank": "blank","double bar": "double bar","seven": "seven","any bar": "any bar","any gold bar": "any gold bar","bell": "bell","heart": "heart","horseshoe": "horseshoe","gold bar": "gold bar","diamond": "diamond","chicken": "chicken","maggie": "Maggie","lisa": "Lisa","marge": "Marge","bart": "Bart","homer": "Homer","pork": "pork","veal": "veal","turkey": "turkey","steak": "steak","penguin": "Penguin","2face": "Two Face","riddler": "The Riddler","joker": "The Joker","batman": "Batman"}',
    },
  },
};

const utils = (locale) => {
  let translation;
  if (resources[locale]) {
    translation = resources[locale].translation;
  } else {
    translation = resources['en-US'].translation;
  }

  return {
    strings: translation,
  };
};

module.exports = utils;
