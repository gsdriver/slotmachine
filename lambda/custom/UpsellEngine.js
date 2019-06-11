//
// Manages upsells for the skill - recommending an upsell
// and recording information that will be used to make future
// upsell suggestions
//
// This skill defines four trigger points:
//  1. Launch
//  2. After playing a certain number of spins
//  3. When asking to select a new game
//  4. When listing a set of purchased products with none purchased
//
// Versions for analysis:
//  v1.0 (not set) - no upsell on launch, upsell on select every 2 days, spin after 10 spins
//  v1.1 - upsell on launch every three days, upsell on select every day, not on spin
//         Also adds version and number of sessions instead of newUser
//  v1.2 - adds sold field
//  v1.3 - Add A/B variant - v1 upsell after 6 spins, every day; v2 no upsell on spins
//  v1.4 - Only one product upsold per session
//

'use strict';

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

module.exports = {
  getUpsell: function(handlerInput, trigger) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    let directive;
    const now = Date.now();
    const availableProducts = getAvailableProducts(attributes);

    if (availableProducts.length === 0) {
      // There is nothing to upsell
      return;
    }

    // Reserved for our usage
    if (!attributes.upsell) {
      attributes.upsell = {};
      attributes.upsell.prompts = {};
      attributes.upsell.sessions = 0;
    }
    attributes.upsell.version = '1.4';
    if (!attributes.upsell[trigger]) {
      attributes.upsell[trigger] = {};
    }
    if (!attributes.upsell.bucket) {
      attributes.upsell.bucket = getTestBucket(handlerInput);
    }

    // Clear legacy prompts structure
    if (attributes.prompts) {
      attributes.prompts.crazydiamond = undefined;
      attributes.prompts.holiday = undefined;
    }

    // Since we are called on launch, this
    // will help us see the full session length
    if (!attributes.upsell.start) {
      attributes.upsell.start = now;
      attributes.upsell.sessions = (attributes.upsell.sessions + 1) || 1;
      attributes.upsell.availableProducts = availableProducts;
    }

    attributes.upsell[trigger].trigger = now;
    attributes.upsell[trigger].count = (attributes.upsell[trigger].count + 1) || 1;
    const upsellProduct = shouldUpsell(attributes, availableProducts, trigger, now);
    if (upsellProduct) {
      attributes.upsell[trigger].impression = {product: upsellProduct, time: now};
      attributes.upsell.prompts[upsellProduct] = now;
      directive = {
        'type': 'Connections.SendRequest',
        'name': 'Upsell',
        'payload': {
          'InSkillProduct': {
            productId: attributes.paid[upsellProduct].productId,
          },
          'upsellMessage': selectUpsellMessage(attributes, upsellProduct, trigger.toUpperCase() + '_UPSELL'),
        },
        'token': upsellProduct,
      };
    }

    return directive;
  },
  saveSession: function(handlerInput) {
    // Is this a "natural" end to the session or an upsell?
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const response = handlerInput.responseBuilder.getResponse();
    const now = Date.now();
    let upsell = false;
    let promise;
    const availableProducts = getAvailableProducts(attributes);

    // Save if there are available products OR if we ended on upsell
    if (availableProducts.length
      || (attributes.upsell && attributes.upsell.endOnUpsell)) {
      if (response.directives) {
        response.directives.forEach((directive) => {
          if ((directive.type === 'Connections.SendRequest') &&
            ((directive.name === 'Upsell') || (directive.name === 'Buy'))) {
            upsell = true;
            attributes.upsell.endOnUpsell = true;
          }
        });
      }

      // If it wasn't an upsell, save and reset session details
      // otherwise, persist as if it were part of the same session
      if (!upsell) {
        // Save session closing information
        if (!attributes.upsell) {
          attributes.upsell = {};
        }
        attributes.upsell.end = now;

        // If available product list has changed, it means an upsell happened!
        attributes.upsell.sold = (attributes.upsell.availableProducts &&
          (availableProducts.length < attributes.upsell.availableProducts.length));
        attributes.upsell.availableProducts = undefined;

        // Save to S3 - if we are saving data
        if (process.env.SNSTOPIC) {
          const params = {
            Body: JSON.stringify(attributes.upsell),
            Bucket: 'garrett-alexa-upsell',
            Key: 'slots/' + handlerInput.requestEnvelope.session.user.userId
              + '/' + Date.now() + '.txt',
          };
          promise = s3.putObject(params).promise();
        }

        // Clear everything except the prompts and sessions data
        const prompts = JSON.parse(JSON.stringify(attributes.upsell.prompts));
        const sessions = attributes.upsell.sessions;
        attributes.upsell = {};
        attributes.upsell.prompts = prompts;
        attributes.upsell.sessions = sessions;
        attributes.upsell.lastSession = now;
      }
    }

    if (!promise) {
      promise = Promise.resolve();
    }
    return promise;
  },
};

// The message is hardcoded
function selectUpsellMessage(attributes, game, message) {
  let selection;

  // Store upsell messages locally
  // These aren't localized outside of en-US anyway
  const upsellMessages = {
    'LAUNCH_UPSELL': 'Hello, welcome to Slot Machine. We now have {Game} available for purchase. Want to learn more?|Hi, welcome to Slot Machine. We\'re proud to introduce {Game} now available for purchase! Want to hear more about it?|Welcome back to Slot Machine. In addition to our built in machines, we also have {Game} available for purchase. Are you interested in hearing more about it?',
    'SELECT_UPSELL': 'We have {Game} machine available for purchase. Want to learn more?|We\'re proud to introduce {Game} machine now available for purchase. Would you like to hear more about it?|In addition to our built in machines, we also have {Game} available for purchase. Are you interested in hearing more about it?',
    'SPIN_UPSELL': 'Thanks for playing. We now have {Game} available for purchase. Want to learn more?|We\'re glad to see you\'ve been enjoying Slot Machine. We\'re proud to introduce {Game} now available for purchase. Would you like to hear more about it?|In addition to our built in machines, we\'re proud to introduce {Game} now available for purchase. Are you interested in hearing more about it?',
    'LISTPURCHASES_UPSELL': 'You don\'t have any products purchased, but we have {Game} available. Want to learn more?|You haven\'t purchased any products, but we have {Game} available for purchase. Would you like to hear more?|You haven\'t bought any products yet, but we have {Game} available for purchase. Want to hear more?',
  };
  const gameList = {
    'crazydiamond': 'crazy diamonds',
    'holiday': 'the holiday game',
    'valentine': 'the valentine\'s day game',
    'independenceday': 'the independence day game',
  };

  const options = upsellMessages[message].split('|');
  selection = Math.floor(Math.random() * options.length);
  if (selection === options.length) {
    selection--;
  }
  attributes.upsellSelection = 'v' + (selection + 1);
  return options[selection].replace('{Game}', gameList[game]);
}

function shouldUpsell(attributes, availableProducts, trigger, now) {
  let upsellProduct;

  // Have we already offered an upsell on this trigger in this session?
  if (attributes.upsell[trigger].impression) {
    return;
  }

  switch (trigger) {
    case 'launch':
      // Upsell once every three days, after their third time playing
      if (attributes.upsell.sessions > 2) {
        availableProducts.forEach((product) => {
          if (!attributes.upsell.prompts[product] ||
            ((now - attributes.upsell.prompts[product]) > 3*24*60*60*1000)) {
              upsellProduct = product;
          }
        });
      }
      break;

    case 'select':
      // Go through and see if there is a machine we can offer as upsell
      // We only offer each machine once per day
      // So as not to annoy our customers too much
      availableProducts.forEach((product) => {
        if (!attributes.upsell.prompts[product] ||
          ((now - attributes.upsell.prompts[product]) > 24*60*60*1000)) {
            upsellProduct = product;
        }
      });
      break;

    case 'spin':
      // v1: Upsell a machine after 6 spins but only once a day (per machine)
      // v2: No upsell
      if (attributes.upsell.bucket === 'v1') {
        if (attributes.upsell.spin.count === 6) {
          // OK, let's check if any products are available to upsell
          availableProducts.forEach((product) => {
            if (!attributes.upsell.prompts[product] ||
              ((now - attributes.upsell.prompts[product]) > 24*60*60*1000)) {
                upsellProduct = product;
            }
          });
        }
      }
      break;

    case 'listpurchases':
      // Always upsell whatever was least recently upsold
      availableProducts.forEach((product) => {
        if (!upsellProduct ||
          (attributes.upsell.prompts[upsellProduct]
            && (!attributes.upsell.prompts[product]
            || (attributes.upsell.prompts[product] < attributes.upsell.prompts[upsellProduct])))) {
          upsellProduct = product;
        }
      });
      break;

    default:
      // Unknown trigger
      break;
  }

  return upsellProduct;
}

function getAvailableProducts(attributes) {
  const availableProducts = [];

  // Get a list of available products - if none, return
  if (attributes.paid) {
    let product;
    for (product in attributes.paid) {
      // Note we only upsell machines - not coinreset
      // We also aren't upselling the holiday game anymore (seasonal)
      if (attributes.playerLocale !== 'en-US') {
        // Cert wants to see these
        if (product && (product !== 'coinreset')
          && (attributes.paid[product].state === 'AVAILABLE')) {
          availableProducts.push(product);
        }
      } else {
        if (product && (product !== 'coinreset')
          && (product !== 'holiday')
          && (product !== 'valentine')
          && (attributes.paid[product].state === 'AVAILABLE')) {
          availableProducts.push(product);
        }
      }
    }
  }

  return availableProducts;
}

function getTestBucket(handlerInput) {
  const event = handlerInput.requestEnvelope;

  // Bucketing should change for each version with a test
  // For v1.3, there are two buckets - derived from adding first
  // 10 characters of userId and moding by 2
  let i;
  let total = 0;
  const names = event.session.user.userId.split('.');
  const user = names[names.length - 1];

  for (i = 0; i < Math.max(10, user.length); i++) {
    total += user.charCodeAt(i);
  }
  return (total % 2 == 0) ? 'v1' : 'v2';
}
