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
      // First reformat the ads played if it's old style
      if (attributes.adsPlayed) {
        let ad;
        for (ad in attributes.adsPlayed) {
          if (!attributes.adsPlayed[ad].hasOwnProperty('timesPlayed')) {
            const newAd = {};
            newAd.time = attributes.adsPlayed[ad];
            newAd.timesPlayed = 1;
            attributes.adsPlayed[ad] = newAd;
          }
        }
      }

      // Read the S3 buckets that has everyone's scores
      const languages = locale.split('-');
      const adBucket = 'garrett-alexa-usage/ads/' + skill;
      s3.getObject({Bucket: adBucket, Key: 'CurrentAds.txt'}, (err, data) => {
        if (err) {
          console.log('Error reading current ad list: ' + err);
          callback('');
        } else {
          // OK, let's parse the current ads and see which we've already run
          const ads = JSON.parse(data.Body.toString('ascii'));
          let adToRun;
          let adRepeats;

          if (!ads || !ads.running) {
            callback('');
          } else {
            ads.running.forEach((ad) => {
              // Is this ad appropriate for this locale (no locale means all locales)
              let runInLocale;
              if (ad.locale) {
                const localesToRun = ad.locale.split('|');
                localesToRun.forEach((loc) => {
                  if ((loc == locale) || (loc == languages[0])) {
                    runInLocale = true;
                  }
                });
              } else {
                // OK to run globally
                runInLocale = true;
              }

              if (runInLocale) {
                // Did we already show this ad?  If not, that's the one we'll pick
                if (!adToRun) {
                  // If there is a condition, make sure that it's met
                  let adCandidate;
                  if (ad.condition) {
                    if (eval(ad.condition)) {
                      adCandidate = ad.name;
                      adRepeats = (ad.repeat) ? ad.repeat : 1;
                    }
                  } else {
                    // No condition - just run this
                    adCandidate = ad.name;
                    adRepeats = (ad.repeat) ? ad.repeat : 1;
                  }

                  // Make sure we haven't run this ad the requested number of times
                  if (adCandidate && (!attributes.adsPlayed || !attributes.adsPlayed[adCandidate]
                    || (adRepeats === 'infinity')
                    || (attributes.adsPlayed[adCandidate].timesPlayed < adRepeats))) {
                    // We're good with this one!
                    adToRun = adCandidate;
                  }
                }
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
                  if (!attributes.adsPlayed[adToRun]) {
                    attributes.adsPlayed[adToRun] = {};
                  }
                  attributes.adsPlayed[adToRun].time = Date.now();
                  attributes.adsPlayed[adToRun].timesPlayed =
                    (attributes.adsPlayed[adToRun].timesPlayed + 1) || 1;
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
