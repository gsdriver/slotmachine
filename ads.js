//
// Ad serving network
//

'use strict';

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const s3 = new AWS.S3({apiVersion: '2006-03-01'});

module.exports = {
  getAd: function(attributes, skill, locale, callback) {
    // If environment variable is set, no ad
    if (process.env.NOAD) {
      callback('');
    } else {
      // Read the S3 buckets that has everyone's scores
      const adBucket = 'garrett-alexa-usage/ads/' + skill + '/' + locale;

      s3.getObject({Bucket: adBucket, Key: 'CurrentAds.txt'}, (err, data) => {
        if (err) {
          console.log('Error reading current ad list: ' + err);
          callback('');
        } else {
          // OK, let's parse the current ads and see which we've already run
          const ads = JSON.parse(data.Body.toString('ascii'));
          let adToRun;

          if (!ads || !ads.running) {
            callback('');
          } else {
            ads.running.forEach((ad) => {
              // Did we already show this ad?  If not, that's the one we'll pick
              if (!adToRun && (!attributes.adsPlayed || !attributes.adsPlayed[ad])) {
                adToRun = ad;
              }
            });

            if (adToRun) {
              s3.getObject({Bucket: adBucket, Key: adToRun}, (adErr, adData) => {
                if (adErr) {
                  console.log('Error reading ad ' + adToRun + ': ' + adErr);
                  callback('');
                } else {
                  const adText = adData.Body.toString('ascii');

                  // Mark the ad as played
                  if (!attributes.adsPlayed) {
                    attributes.adsPlayed = {};
                  }
                  attributes.adsPlayed[adToRun] = Date.now();
                  callback(adText ? adText : '');
                }
              });
            } else {
              // Nope, we've played all the ads so far
              callback('');
            }
          }
        }
      });
    }
  },
};
