// Localized resources

const seedrandom = require('seedrandom');

const resources = {
  'en-US': {
    'translation': {
      // From index.js
      'UNKNOWN_INTENT': 'Sorry, I didn\'t get that. Try saying Spin.',
      'UNKNOWN_INTENT_REPROMPT': 'Try saying Spin.',
      'UNKNOWN_SELECT_INTENT': 'Sorry, I didn\'t get that. Try saying Yes.',
      'UNKNOWN_SELECT_INTENT_REPROMPT': 'Try saying Yes.',
      // Launch.js
      'LAUNCH_REPROMPT': 'Would you like to play {Game}? ',
      'LAUNCH_WELCOME': 'Welcome to Slot Machine. |{Greeting} Welcome to Slot Machine. |{Greeting} It\'s time to play Slot Machine! |{Greeting} Let\'s play Slot Machine! ',
      'LAUNCH_WELCOME_TOURNAMENT': 'Welcome back to Slot Machine. We have a tournament under way for the next {Time}. |It\'s tournament time on Slot machine for the next {Time}. |We\'ve got a tournament for the next {Time}! ',
      'LAUNCH_WELCOME_BUTTON': 'If you have an Echo Button, press it to play {Game1} <break time=\"200ms\"/> You can also say spin to play {Game2} or no to pick a different machine.',
      'LAUNCH_WELCOME_LIST_GAMES': 'Welcome to Slot Machine. |{Greeting} Welcome to Slot Machine. |{Greeting} It\'s time to play Slot Machine! |{Greeting} Let\'s play Slot Machine! ',
      'LAUNCH_NEWUSER': '<audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/casinowelcome.mp3\"/> {Greeting} Welcome to Slot Machine. Say spin to pull the handle.',
      'LAUNCH_NEWUSER_BUTTON': '<audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/casinowelcome.mp3\"/> {Greeting} Welcome to Slot Machine. If you have an Echo Button press it or say spin to pull the handle.',
      'LAUNCH_NEWUSER_REPROMPT': 'Say spin to pull the handle.',
      'LAUNCH_RESUME_GAME': 'Say spin to pull the handle.',
      'LAUNCH_RESUME_GAME_BUTTON': 'If you have an Echo Button press it or say spin to pull the handle.',
      'LAUNCH_RESUME_GAME_REPROMPT': 'Say spin to pull the handle.',
      'LAUNCH_BUSTED': 'You are out of coins. Come back to Slot Machine tomorrow for {Coins} more coins. ',
      'LAUNCH_BUSTED_UPSELL': 'You are out of coins and can come back to Slot Machine tomorrow for {Coins} more coins. Are you interested in learning about buying a subscription to automatically reset your bankroll whenever you go bust? ',
      'LAUNCH_BUSTED_REPLENISH': 'Thanks for coming back! Here are {Coins} coins to get you back in the game. |Good to see you again! Here are {Coins} coins to keep playing. |Hey you! Here are {Coins} coins to get you back in the game. ',
      'LAUNCH_BUSTED_TOURNAMENT': 'You know <break time=\"500ms\"/> I\'m not supposed to do this <break time=\"400ms\"/> but here are 5 coins just so you can enter the tournament round. ',
      'SUBSCRIPTION_PAID_REPLENISH': 'Thanks to your Reset Bankroll subscription, your bankroll is reset to {Coins} coins. ',
      // From Purchase.js
      'PURCHASE_PRODUCTS': 'We have {Products} available for purchase. Say the product you would like to buy or no to continue your game. ',
      'PURCHASE_CONFIRM_REPROMPT': 'Say the product you want to buy or no to continue your game.',
      'PURCHASE_NO_PURCHASE': 'What else can I help you with?',
      'PURCHASE_PRODUCT_LIST': 'a Reset Bankroll subscription which will automatically reset your bankroll whenever you run out of coins and a Crazy Diamond machine with wild diamond symbols ',
      // From Refund.js
      'REFUND_SAY_PRODUCT': 'Say the name of the product you want to refund such as Cancel Crazy Diamonds or Cancel Reset Bankroll.',
      // Select.js
      'SELECT_WELCOME': 'Welcome to {Game}. |Starting {Game}. |Let\'s give {Game} a spin. |Time for {Game}! ',
      'SELECT_REPROMPT': 'You can bet up to {Coins} coins or say read high scores to hear the leader board.',
      'SELECT_UPSELL': 'We have {Game} machine available for purchase. Want to learn more?',
      // From Exit.js
      'EXIT_GAME': '{Ad} Goodbye.',
      // From HighScore.js
      'HIGHSCORE_REPROMPT': 'What else can I help you with?',
      // From Help.js
      'HELP_ACTIVE_TOURNAMENT': 'There are {Time} left in tournament play. At the end of the tournament the highest bankroll will win {Coins} coins. ',
      'HELP_COMMANDS': 'Say spin to pull the handle <break time=\"200ms\"/> or select a new machine to change to a different machine. ',
      'HELP_TOURNAMENT': 'Play the tournament round every {Time} for a chance to win an extra {Coins} coins! ',
      'HELP_REPROMPT': 'Check the Alexa companion app for the payout table.',
      'HELP_CARD_TITLE': 'Payout Table',
      'HELP_SELECT_TEXT': 'Say yes to select the offered machine, or no for a different machine. ',
      'HELP_FALLBACK': 'Sorry, I didn\'t get that. <break time=\"200ms\"/> ',
      // From Rules.js
      'RULES_REPROMPT': 'Say bet to insert coins or spin to pull the handle.',
      'RULES_SELECT_REPROMPT': 'Say yes to play this game or no to hear the next option.',
      'RULES_CARD_TITLE': 'Payout Table',
      // From Spin.js
      'SPIN_YOU_BET': 'You bet {AmountBet}. ',
      'SPIN_RESULT': ' {Result}. ',
      'SPIN_PROGRESSIVE_WINNER': 'You hit the progressive jackpot and won {AmountWon}! ',
      'SPIN_WINNER': 'You matched {Match} and won {AmountWon}. |you won {AmountWon}. |that gives you {AmountWon}. |<break time=\"200ms\"/> winner winner chicken dinner! You\'re getting {AmountWon}. ',
      'SPIN_LOSER': 'Sorry, you lost. |That hurt. |No coins for you this time. |Sorry, you lost. |You lost. ',
      'SPIN_BIG_LOSER': 'Sorry, you lost. |Lost again? Maybe you should try a different machine. |You lost, hang in there <break time=\"200ms\"/> you\'re due. |Wow, you\'ve lost a lot on this machine. |You\'re probably getting used to hearing this <break time=\"200ms\"/> you lost. ',
      'SPIN_PLAY_AGAIN': 'Would you like to spin again?|Spin again?|Try again?|One more spin?',
      'SPIN_BUSTED': 'You lost all your money. Come back tomorrow for {Coins} coins. ',
      'SPIN_OUTOFMONEY': 'You are out of coins and out of the tournament. Better luck next week! ',
      'SPIN_NEWUSER': 'If you would like to try a different machine, say change machine or say spin to spin again. ',
      // From Testing.js
      'TEST_CONFIRM_BANKRUPT': 'Do you want to test going bankrupt?  Say yes to set your bankroll to 1 coin or no to continue play.',
      'TEST_CONFIRM_BANKRUPT_REPROMPT': 'Say yes enter test mode or no to continue play.',
      'TEST_BANKRUPT_SET': 'Your bankroll has been reset to 1 coin and you will lose your next spin.  Say spin to test.',
      'TEST_BANKRUPT_REPROMPT': 'Say spin to test.',
      'TEST_BANKRUPT_NOT_SET': 'Test mode not enabled. Say spin to pull the handle.',
      'TEST_BARNKUPT_NOT_SET_REPROMPT': 'Say spin to pull the handle.',
      // From utils.js
      'ERROR_REPROMPT': 'What else can I help with?',
      'ANY_SLOT': 'any',
      'PAYOUT_PAYS': 'pays {Coins} coins.',
      'PAYOUT_PROGRESSIVE': 'pays the progessive jackpot.',
      'LEADER_RANKING': 'Your peak bankroll of {Coins} coins ranks you as <say-as interpret-as="ordinal">{Rank}</say-as> of {Players} players. ',
      'LEADER_GAME_RANKING': 'Your current bankroll of {Coins} coins on {CurrentGame} ranks you as <say-as interpret-as="ordinal">{Rank}</say-as> of {Players} players. ',
      'LEADER_NO_SCORES': 'Sorry, I\'m unable to read the current leader board. ',
      'LEADER_FORMAT': '{Coins} coins',
      'LEADER_TOP_SCORES': 'The top {NumberOfLeaders} bankrolls are {Bankrolls}. ',
      'AVAILABLE_GAMES': 'We have {Number} different games <break time=\"200ms\"/> ',
      'WILD_SPECIAL': 'Cherries are wild. ',
      'DIAMOND_SPECIAL': 'Diamonds are wild. ',
      'PITY_PAYOUT': 'Every spin not mentioned wins 1 coin when 5 coins are played. ',
      'HIGH_JACKPOT': 'Today\'s tournament features a 1000 to 1 maximum payout! ',
      'HIGH_PAYOUT': 'Today\'s tournament machine pays out at 110%! ',
      'STANDARD_MEAT': 'Today\'s tournament is the standard meat game. ',
      'EVERYONE_WINS': 'On today\'s tournament machine every spin wins when 5 coins are played. ',
      'SIMPSON_GAME': 'Today\'s tournament machine is <audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/simpsons.mp3\"/> ',
      'BATMAN_GAME': 'Today\'s tournament machine is <audio src=\"https://s3-us-west-2.amazonaws.com/alexasoundclips/batman.mp3\"/> ',
      'PROGRESSIVE_SPECIAL': 'Diamond diamond diamond wins the progressive jackpot when the maximum number of coins are played. ',
      'SELECT_GAME': 'Select a game to play',
      'DISPLAY_PAYOUT_WINNER': 'You won {Coins} coins',
      'DISPLAY_PAYOUT_LOSER': 'Sorry, you lost',
      'TOURNAMENT_WINNER': 'Congratulations, you won the tournament with {TournamentResult} coins!  You win {Coins} coins for your tournament win! ',
      'TOURNAMENT_LOSER': 'Sorry, you didn\'t win the tournament. The high score was {TournamentWinner} coins and you had {TournamentResult} coins. ',
      'TOURNAMENT_TIMELEFT_MINUTES': '{Minutes} minutes',
      'TOURNAMENT_TIMELEFT_MINUTES_AND_SECONDS': '{Minutes} minutes and {Seconds} seconds',
      'TOURNAMENT_TIMELEFT_SECONDS': '{Seconds} seconds',
      'TOURNAMENT_DEFAULT_TIMEZONE': ' Pacific time',
      'GOOD_MORNING': 'Good morning <break time=\"200ms\"/> ',
      'GOOD_AFTERNOON': 'Good afternoon <break time=\"200ms\"/> ',
      'GOOD_EVENING': 'Good evening <break time=\"200ms\"/> ',
      // General
      'SINGLE_COIN': 'coin',
      'PLURAL_COIN': 'coins',
      'READ_BANKROLL': 'You have {Amount}. ',
      'PROGRESSIVE_JACKPOT_ONLY': 'The progressive jackpot is currently {Jackpot} coins. ',
      'PROGRESSIVE_JACKPOT': 'The progressive jackpot is currently {Jackpot} coins. Bet {Coins} coins to win the progressive jackpot. ',
      'TOURNAMENT_ENDED': 'The tournament has ended. Please check again later to hear the results! ',
      'GAME_NAME_BASIC': 'the standard fruit game',
      'GAME_NAME_WILD': 'wild cherry',
      'GAME_NAME_LOOSE': 'the 105% payout game',
      'GAME_NAME_PROGRESSIVE': 'progressive jackot',
      'GAME_NAME_TOURNAMENT': 'the tournament round',
      'GAME_NAME_STEAK': 'the meat game',
      'GAME_NAME_CRAZYDIAMOND': 'crazy diamonds',
      'SYMBOL_NAME_CHERRY': 'cherry',
      'SYMBOL_NAME_LEMON': 'lemon',
      'SYMBOL_NAME_ORANGE': 'orange',
      'SYMBOL_NAME_PLUM': 'plum',
      'SYMBOL_NAME_BAR': 'bar',
      'SYMBOL_NAME_BLANK': 'blank',
      'SYMBOL_NAME_DOUBLE BAR': 'double bar',
      'SYMBOL_NAME_SEVEN': 'seven',
      'SYMBOL_NAME_ANY BAR': 'any bar',
      'SYMBOL_NAME_ANY GOLD BAR': 'any gold bar',
      'SYMBOL_NAME_BELL': 'bell',
      'SYMBOL_NAME_HEART': 'heart',
      'SYMBOL_NAME_HORSESHOE': 'horseshoe',
      'SYMBOL_NAME_GOLD BAR': 'gold bar',
      'SYMBOL_NAME_DIAMOND': 'diamond',
      'SYMBOL_NAME_CHICKEN': 'chicken',
      'SYMBOL_NAME_MAGGIE': 'Maggie',
      'SYMBOL_NAME_LISA': 'Lisa',
      'SYMBOL_NAME_MARGE': 'Marge',
      'SYMBOL_NAME_BART': 'Bart',
      'SYMBOL_NAME_HOMER': 'Homer',
      'SYMBOL_NAME_PORK': 'pork',
      'SYMBOL_NAME_VEAL': 'veal',
      'SYMBOL_NAME_TURKEY': 'turkey',
      'SYMBOL_NAME_STEAK': 'steak',
      'SYMBOL_NAME_PENGUIN': 'Penguin',
      'SYMBOL_NAME_2FACE': 'Two Face',
      'SYMBOL_NAME_RIDDLER': 'The Ridder',
      'SYMBOL_NAME_JOKER': 'The Joker',
      'SYMBOL_NAME_BATMAN': 'Batman',
      'SYMBOL_NAME_STAR': 'star',
      'SYMBOL_NAME_WATERMELON': 'watermelon',
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
    pickRandomOption: function(event, attributes, res) {
      if (res && translation[res]) {
        const options = translation[res].split('|');
        let seed = event.session.user.userId;
        if (attributes.currentGame && attributes[attributes.currentGame]
          && attributes[attributes.currentGame].timestamp) {
          seed += attributes[attributes.currentGame].timestamp;
        }
        return options[Math.floor(seedrandom(seed)() * options.length)];
      } else {
        return undefined;
      }
    },
  };
};

module.exports = utils;
