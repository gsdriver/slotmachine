//
// Provides access to resources
//

const fs = require('fs');
let translation;

// For now, all resources are in en-US - we could do fallback logic with locale
const data = fs.readFileSync(__dirname + '/resources/en-US.json', 'utf8');
if (data) {
  translation = JSON.parse(data);
  console.log('Resources loaded');
}

const utils = (locale) => {
  return {
    strings: translation,
  };
};

module.exports = utils;
