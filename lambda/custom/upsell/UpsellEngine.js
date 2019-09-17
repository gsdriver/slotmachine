//
// Communicates to the upsell service
// Basically the SDK to the server
//

'use strict';

const rp = require('request-promise');

module.exports = {
  processRequest: async function(event) {
    const body = {
      key: 'Tralfaz',
      alexa: event,
    };
    const params = {
      url: process.env.SERVICEURL + 'upsell/processRequest',
      method: 'POST',
      json: body,
    };
    return rp(params).then((data) => {
      console.log('processRequest', data);
      return;
    });
  },
  processResponse: async function(response, userId) {
    const body = {
      key: 'Tralfaz',
      alexa: {
        userId,
        response,
      },
    };
    const params = {
      url: process.env.SERVICEURL + 'upsell/processResponse',
      method: 'POST',
      json: body,
    };
    return rp(params).then((data) => {
      console.log('processResponse', data);
      return;
    });
  },
  evaluateTrigger: function(userId, trigger) {
    const body = {
      key: 'Tralfaz',
    };
    const params = {
      url: process.env.SERVICEURL + 'upsell/evaluateTrigger',
      qs: {
        userId,
        trigger,
      },
      method: 'GET',
      json: body,
    };
    return rp(params).then((data) => {
      console.log('evaluateTrigger', trigger, data);
      return data.directive;
    });
  },
};
