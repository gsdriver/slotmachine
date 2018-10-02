var utils = require('../lambda/custom/utils');

// Get a game and do 1000 spins to simulate what happens
let rules;

function doSpin() {
  // Pick random numbers based on the rules of the game
  const spinResult = [];
  let i;

  for (i = 0; i < rules.slots; i++) {
    let spin;
    let j;
    let total = 0;

    for (j = 0; j < rules.frequency[i].symbols.length; j++) {
      total += rules.frequency[i].symbols[j];
    }

    spin = Math.floor(Math.random() * total);

    for (j = 0; j < rules.frequency[i].symbols.length; j++) {
      if (spin < rules.frequency[i].symbols[j]) {
        // This is it!
        spinResult.push(rules.symbols[j]);
        break;
      }

      // Nope, go to the next one
      spin -= rules.frequency[i].symbols[j];
    }
  }

  return spinResult;
}

function getPayout(spinResult, rules) {
  // Now let's determine the payouts
  let matchedPayout;
  let payout;

  for (payout in rules.payouts) {
    if (payout) {
      const slots = payout.split('|');
      let i;
      let isMatch = true;

      for (i = 0; i < slots.length; i++) {
        if (slots[i] !== spinResult[i]) {
          // Let's see if this can substitute
          if (rules.substitutes && rules.substitutes[spinResult[i]]) {
            // It can - can it substitute for this symbol though?
            if (rules.substitutes[spinResult[i]].indexOf(slots[i]) < 0) {
              // Nope, it doesn't substitute
              isMatch = false;
              break;
            }
          } else {
            isMatch = false;
            break;
          }
        }
      }

      if (isMatch) {
        if (matchedPayout) {
          // Is this one better?
          if (rules.payouts[payout] > rules.payouts[matchedPayout]) {
            matchedPayout = payout;
          }
        } else {
          matchedPayout = payout;
        }
      }
    }
  }

  return matchedPayout;
}

function runSimulation() {
  // 1,000,000 coins; 1,000,000 spins
  const START = 1000000;
  let bankroll = START;
  const SPINCOUNT = 1000000;
  let i;
  let spinResult;
  let matchedPayout;
  const results = {};
  let result;
  let progressive;
  let spinsThisProgressive = 0;

  for (i = 0; i < SPINCOUNT; i++) {
    spinResult = doSpin();
    spinsThisProgressive++;
    matchedPayout = getPayout(spinResult, rules);
    if (matchedPayout) {
      let payoutAmount;

      // Is this the progressive?
      if (rules.progressive && (rules.progressive.match === matchedPayout)) {
        // Yep - calculate as starting plus losers times the rate
        payoutAmount = Math.floor(rules.progressive.start + rules.progressive.rate * spinsThisProgressive);
        console.log('Progressive win ' + payoutAmount);
        spinsThisProgressive = 0;
      } else {
        payoutAmount = rules.payouts[matchedPayout];
      }

      bankroll += (payoutAmount - 1);
      results[matchedPayout] = (!results[matchedPayout]) ? 1 : (results[matchedPayout] + 1);
    } else {
      bankroll--;
      results.loser = (!results.loser) ? 1 : (results.loser + 1);
    }
  }

  // Spit out the results
  console.log('Ending bankroll was ' + bankroll);
  console.log('Payout was ' + (1.0 + (bankroll - START) / SPINCOUNT));
  for (result in results) {
    if (result) {
      console.log(result + ': ' + results[result]);
    }
  }
}

if (process.argv.length > 2) {
  rules = utils.getGame(process.argv[2]);
} else {
  rules = utils.getGame('basic');
}

if (rules) {
  runSimulation();
} else {
  console.log('Unknown game ' + process.argv[2]);
}

