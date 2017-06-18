var utils = require('../utils');

// Get a game and do 1000 spins to simulate what happens
const rules = utils.getGame('wild');

function doSpin() {
  // Pick random numbers based on the rules of the game
  const spinResult = [];
  let i;

  for (i = 0; i < rules.slots; i++) {
    let spin;
    let j;

    spin = Math.floor(Math.random() * rules.frequency[i].total);

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
  let bankroll = 1000000;
  const SPINCOUNT = 1000000;
  let i;
  let spinResult;
  let matchedPayout;
  const results = {};
  let result;

  for (i = 0; i < SPINCOUNT; i++) {
    spinResult = doSpin();
    matchedPayout = getPayout(spinResult, rules);
    if (matchedPayout) {
      bankroll += (rules.payouts[matchedPayout] - 1);
      results[matchedPayout] = (!results[matchedPayout]) ? 1 : (results[matchedPayout] + 1);
    } else {
      bankroll--;
      results.loser = (!results.loser) ? 1 : (results.loser + 1);
    }
  }

  // Spit out the results
  console.log('Ending bankroll was ' + bankroll);
  for (result in results) {
    if (result) {
      console.log(result + ': ' + results[result]);
    }
  }
}

runSimulation();

