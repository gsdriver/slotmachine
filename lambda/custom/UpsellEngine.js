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

'use strict';

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

module.exports = {
  getUpsell: function(attributes, trigger) {
    let directive;
    const now = Date.now();
    const availableProducts = [];

    // Get a list of available products - if none, return
    if (attributes.paid) {
      let product;
      for (product in attributes.paid) {
        // Note we only upsell machines - not coinreset
        if (product && (product !== 'coinreset')
          && (attributes.paid[product].state === 'AVAILABLE')) {
          availableProducts.push(product);
        }
      }
    }

    if (availableProducts.length === 0) {
      // There is nothing to upsell
      return;
    }

    // Reserved for our usage
    if (!attributes.upsell) {
      attributes.upsell = {};
      attributes.upsell.prompts = {};
      attributes.upsell.newUser = true;
    }
    if (!attributes.upsell[trigger]) {
      attributes.upsell[trigger] = {};
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

    // Save if they can but haven't purchased Spanish 21
    if ((attributes.paid && attributes.paid.spanish
      && (attributes.paid.spanish.state === 'AVAILABLE'))
      || (attributes.upsell && attributes.upsell.endOnUpsell)) {
      if (response.directives) {
        response.directives.forEach((directive) => {
          if ((directive.type === 'Connections.SendRequest') && (directive.name === 'Upsell')) {
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

        // Clear everything except the prompts data
        const prompts = JSON.parse(JSON.stringify(attributes.upsell.prompts));
        attributes.upsell = {};
        attributes.upsell.prompts = prompts;
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
    'LAUNCH_UPSELL': 'Hello, welcome to Slot Machine. We now have {Game} available for purchase. Want to learn more?|Hi, welcome to Slot Machine. We\'re proud to introduce a new machine with {Game}! Want to hear more about it?|Welcome back to Slot Machine. We have {Game} available for purchase. Want to learn more?',
    'SELECT_UPSELL': 'We have {Game} machine available for purchase. Want to learn more?|We\'re proud to introduce {Game} machine now available for purchase. Would you like to hear more about it?|In addition to our built in machines, we also have {Game} available for purchase. Are you interested in hearing more about it?',
    'SPIN_UPSELL': 'Thanks for playing. We now have {Game} available for purchase. Want to learn more?|We\'re glad to see you\'ve been enjoying Slot Machine. We\'re proud to introduce {Game} now available for purchase. Would you like to hear more about it?|In addition to our built in machines, we\'re proud to introduce {Game} now available for purchase. Are you interested in hearing more about it?',
    'LISTPURCHASES_UPSELL': 'You don\'t have any products purchased, but we have {Game} available. Want to learn more?|You haven\'t purchased any products, but we have {Game} available for purchase. Would you like to hear more?|You haven\'t bought any products yet, but we have {Game} available for purchase. Want to hear more?',
  };
  const gameList = {
    'crazydiamond': 'crazy diamonds',
    'holiday': 'the holiday game',
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

  switch (trigger) {
    case 'launch':
      // Currently never upsell
      break;

    case 'select':
      // Go through and see if there is a machine we can offer as upsell
      // We only offer each machine once every two days
      // So as not to annoy our customers too much
      availableProducts.forEach((product) => {
        if (!attributes.upsell.prompts[product] ||
          ((now - attributes.upsell.prompts[product]) > 2*24*60*60*1000)) {
            upsellProduct = product;
        }
      });
      break;

    case 'spin':
      // We upsell a machine after 10 spins
      // And only once every two days for a specific machine
      if (attributes.upsell.spin.count === 10) {
        // OK, let's check if any products are available to upsell
        availableProducts.forEach((product) => {
          if (!attributes.upsell.prompts[product] ||
            ((now - attributes.upsell.prompts[product]) > 2*24*60*60*1000)) {
              upsellProduct = product;
          }
        });
      }
      break;

    case 'listpurchases':
      // Always upsell the first available game
      upsellProduct = availableProducts[0];
      break;

    default:
      // Unknown trigger
      break;
  }

  return upsellProduct;
}
