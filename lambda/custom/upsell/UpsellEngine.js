//
// Communicates to the upsell service
// Basically the SDK to the server
//

'use strict';

const rp = require('request-promise');

module.exports = {
  processRequest: async function(event) {
    const body = {
      key: process.env.REVISUPKEY,
      alexa: event,
    };
    const params = {
      url: process.env.REVISUPURL + 'upsell/processRequest',
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
      key: process.env.REVISUPKEY,
      alexa: {
        userId,
        response,
      },
    };
    if (process.env.REVISUPNOSAVERAW) {
      body.noSave = true;
    }
    const params = {
      url: process.env.REVISUPURL + 'upsell/processResponse',
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
      key: process.env.REVISUPKEY,
    };
    const params = {
      url: process.env.REVISUPURL + 'upsell/evaluateTrigger',
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
