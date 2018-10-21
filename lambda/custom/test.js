var mainApp = require('./index');

const attributeFile = 'attributes.txt';

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
const fs = require('fs');

const LOCALE= 'en-US';
const APPID = 'amzn1.ask.skill.dcc3c959-8c93-4e9a-9cdf-ccdccd5733fd';
const APITOKEN = '';

function BuildEvent(argv)
{
  // Templates that can fill in the intent
  var bet = {'name': 'BetIntent', 'slots': {'Amount': {'name': 'Amount', 'value': ''}}};
  var spin = {'name': 'SpinIntent', 'slots': {}};
  var select = {'name': 'SelectIntent', 'slots': {}};
  var purchase = {'name': 'PurchaseIntent', 'slots': {'Product': {'name': 'Product', 'value': ''}}};
  var refund = {'name': 'RefundIntent', 'slots': {'Product': {'name': 'Product', 'value': ''}}};
  var rules = {'name': 'RulesIntent', 'slots': {'Rules': {'name': 'Rules', 'value': ''}}};
  var game = {'name': 'GameIntent', 'slots': {'Number': {'name': 'Number', 'value': ''}}};
  var reset = {'name': 'ResetIntent', 'slots': {}};
  var yes = {'name': 'AMAZON.YesIntent', 'slots': {}};
  var no = {'name': 'AMAZON.NoIntent', 'slots': {}};
  var help = {'name': 'AMAZON.HelpIntent', 'slots': {}};
  var fallback = {'name': 'AMAZON.FallbackIntent', 'slots': {}};
  var stop = {'name': 'AMAZON.StopIntent', 'slots': {}};
  var cancel = {'name': 'AMAZON.CancelIntent', 'slots': {}};
  var highScore = {'name': 'HighScoreIntent', 'slots': {}};

  var lambda = {
    "session": {
      "sessionId": "SessionId.c88ec34d-28b0-46f6-a4c7-120d8fba8fa7",
      "application": {
        "applicationId": APPID
      },
      "attributes": {},
      "user": {
        "userId": "not-amazon",
      },
      "new": false
    },
    "request": {
      "type": "IntentRequest",
      "requestId": "EdwRequestId.26405959-e350-4dc0-8980-14cdc9a4e921",
      "locale": LOCALE,
      "timestamp": "2016-11-03T21:31:08Z",
      "intent": {}
    },
    "version": "1.0",
     "context": {
       "AudioPlayer": {
         "playerActivity": "IDLE"
       },
       "Display": {},
       "System": {
         "application": {
           "applicationId": APPID
         },
         "user": {
           "userId": "not-amazon",
         },
         "device": {
           "deviceId": "not-amazon",
           "supportedInterfaces": {
             "AudioPlayer": {},
             "Display": {
               "templateVersion": "1.0",
               "markupVersion": "1.0"
             }
           }
         },
         "apiEndpoint": "https://api.amazonalexa.com",
         "apiAccessToken": APITOKEN,
       }
     },
  };

  var buttonEvent = {
    "session": {
      "sessionId": "SessionId.c88ec34d-28b0-46f6-a4c7-120d8fba8fa7",
      "application": {
        "applicationId": APPID
      },
      "attributes": {},
      "user": {
        "userId": "not-amazon",
      },
      "new": false
    },
    "request": {
      "type": "GameEngine.InputHandlerEvent",
      "requestId": "EdwRequestId.26405959-e350-4dc0-8980-14cdc9a4e921",
      "timestamp": "2018-08-02T01:05:33Z",
      "locale": LOCALE,
      "originatingRequestId": "EdwRequestId.26405959-e350-4dc0-8980-14cdc9a4e921",
      "events": [
        {
          "name": "button_down_event",
          "inputEvents": [
            {
              "gadgetId": "amzn1.ask.gadget.05RPH7PJG9C61DHI4QR0RLOQOHKGUBVM9A7T9FD3V4OR7ASISG8HIIRQT3O4IF0KGJVKUMT0LLB45D78QBJFTLVOEM32UFCRVKLBKMJM9ADL7CEU4EUBO5DNQ83L7EE9PFQQ3LUFE8929JPSGKLN6GTBIKVQBPOUH6SU7C27OEO86DIF32ET8",
              "timestamp": "2018-08-02T01:05:29.371Z",
              "color": "000000",
              "feature": "press",
              "action": "down"
            }
          ]
        }
      ]
    },
    "version": "1.0",
     "context": {
       "AudioPlayer": {
         "playerActivity": "IDLE"
       },
       "Display": {},
       "System": {
         "application": {
           "applicationId": APPID
         },
         "user": {
           "userId": "not-amazon",
         },
         "device": {
           "deviceId": "not-amazon",
           "supportedInterfaces": {
             "AudioPlayer": {},
             "Display": {
               "templateVersion": "1.0",
               "markupVersion": "1.0"
             }
           }
         },
         "apiEndpoint": "https://api.amazonalexa.com",
         "apiAccessToken": APITOKEN,
       }
     },
  };

  var buttonEvent = {
    "session": {
      "sessionId": "SessionId.c88ec34d-28b0-46f6-a4c7-120d8fba8fa7",
      "application": {
        "applicationId": APPID
      },
      "attributes": {},
      "user": {
        "userId": "not-amazon",
      },
      "new": false
    },
    "request": {
      "type": "GameEngine.InputHandlerEvent",
      "requestId": "EdwRequestId.26405959-e350-4dc0-8980-14cdc9a4e921",
      "timestamp": "2018-08-02T01:05:33Z",
      "locale": "en-US",
      "originatingRequestId": "EdwRequestId.26405959-e350-4dc0-8980-14cdc9a4e921",
      "events": [
        {
          "name": "button_down_event",
          "inputEvents": [
            {
              "gadgetId": "amzn1.ask.gadget.05RPH7PJG9C61DHI4QR0RLOQOHKGUBVM9A7T9FD3V4OR7ASISG8HIIRQT3O4IF0KGJVKUMT0LLB45D78QBJFTLVOEM32UFCRVKLBKMJM9ADL7CEU4EUBO5DNQ83L7EE9PFQQ3LUFE8929JPSGKLN6GTBIKVQBPOUH6SU7C27OEO86DIF32ET8",
              "timestamp": "2018-08-02T01:05:29.371Z",
              "color": "000000",
              "feature": "press",
              "action": "down"
            }
          ]
        }
      ]
    },
    "version": "1.0",
     "context": {
       "AudioPlayer": {
         "playerActivity": "IDLE"
       },
       "Display": {},
       "System": {
         "application": {
           "applicationId": "amzn1.ask.skill.dcc3c959-8c93-4e9a-9cdf-ccdccd5733fd"
         },
         "user": {
           "userId": "not-amazon",
         },
         "device": {
           "deviceId": "not-amazon",
           "supportedInterfaces": {
             "AudioPlayer": {},
             "Display": {
               "templateVersion": "1.0",
               "markupVersion": "1.0"
             }
           }
         },
         "apiEndpoint": "https://api.amazonalexa.com",
         "apiAccessToken": APITOKEN,
       }
     },
  };

 var buttonTimeout = {
    "session": {
      "sessionId": "SessionId.c88ec34d-28b0-46f6-a4c7-120d8fba8fa7",
      "application": {
        "applicationId": APPID
      },
      "attributes": {},
      "user": {
        "userId": "not-amazon",
      },
      "new": false
    },
    "request": {
        "type": "GameEngine.InputHandlerEvent",
        "requestId": "EdwRequestId.26405959-e350-4dc0-8980-14cdc9a4e921",
        "timestamp": "2018-10-20T13:50:06Z",
        "locale": LOCALE,
        "originatingRequestId": "EdwRequestId.26405959-e350-4dc0-8980-14cdc9a4e921",
        "events": [
            {
                "name": "timeout_event",
                "inputEvents": []
            }
        ]
    },
    "version": "1.0",
     "context": {
       "AudioPlayer": {
         "playerActivity": "IDLE"
       },
       "Display": {},
       "System": {
         "application": {
           "applicationId": "amzn1.ask.skill.dcc3c959-8c93-4e9a-9cdf-ccdccd5733fd"
         },
         "user": {
           "userId": "not-amazon",
         },
         "device": {
           "deviceId": "not-amazon",
           "supportedInterfaces": {
             "AudioPlayer": {},
             "Display": {
               "templateVersion": "1.0",
               "markupVersion": "1.0"
             }
           }
         },
         "apiEndpoint": "https://api.amazonalexa.com",
         "apiAccessToken": APITOKEN,
       }
     },
  };

  var openEvent = {
    "session": {
      "sessionId": "SessionId.c88ec34d-28b0-46f6-a4c7-120d8fba8fa7",
      "application": {
        "applicationId": "amzn1.ask.skill.dcc3c959-8c93-4e9a-9cdf-ccdccd5733fd"
      },
      "user": {
        "userId": "not-amazon",
      },
      "new": true
    },
    "request": {
      "type": "LaunchRequest",
      "requestId": "EdwRequestId.26405959-e350-4dc0-8980-14cdc9a4e921",
      "locale": LOCALE,
      "timestamp": "2016-11-03T21:31:08Z",
      "intent": {}
    },
    "version": "1.0",
     "context": {
       "AudioPlayer": {
         "playerActivity": "IDLE"
       },
       "Display": {},
       "System": {
         "application": {
           "applicationId": APPID
         },
         "user": {
           "userId": "not-amazon",
         },
         "device": {
           "deviceId": "not-amazon",
           "supportedInterfaces": {
             "AudioPlayer": {},
             "Display": {
               "templateVersion": "1.0",
               "markupVersion": "1.0"
             }
           }
         },
         "apiEndpoint": "https://api.amazonalexa.com",
         "apiAccessToken": APITOKEN,
       }
     },
  };

  // If there is an attributes.txt file, read the attributes from there
  if (fs.existsSync(attributeFile)) {
    data = fs.readFileSync(attributeFile, 'utf8');
    if (data) {
      lambda.session.attributes = JSON.parse(data);
      buttonEvent.session.attributes = JSON.parse(data);
      buttonTimeout.session.attributes = JSON.parse(data);
    }
  }

  // If there is no argument, then we'll just return
  if (argv.length <= 2) {
    console.log('I need some parameters');
    return null;
  } else if (argv[2] == "seed") {
    if (fs.existsSync("seed.txt")) {
      data = fs.readFileSync("seed.txt", 'utf8');
      if (data) {
        return JSON.parse(data);
      }
    }
  } else if (argv[2] == 'bet') {
    lambda.request.intent = bet;
    if (argv.length > 3) {
      bet.slots.Amount.value = argv[3];
    }
  } else if (argv[2] == 'rules') {
    lambda.request.intent = rules;
    if (argv.length > 3) {
      rules.slots.Rules.value = argv[3];
    }
  } else if (argv[2] == 'purchase') {
    lambda.request.intent = purchase;
    if (argv.length > 3) {
      purchase.slots.Product.value = argv[3];
    }
  } else if (argv[2] == 'refund') {
    lambda.request.intent = refund;
    if (argv.length > 3) {
      refund.slots.Product.value = argv[3];
    }
  } else if (argv[2] == 'game') {
    lambda.request.intent = game;
    if (argv.length > 3) {
      game.slots.Number.value = argv[3];
    }
  } else if (argv[2] == 'spin') {
    lambda.request.intent = spin;
  } else if (argv[2] == 'select') {
    lambda.request.intent = select;
  } else if (argv[2] == 'launch') {
    return openEvent;
  } else if (argv[2] == 'button') {
    return buttonEvent;
  } else if (argv[2] == 'timeout') {
    return buttonTimeout;
  } else if (argv[2] == 'highscore') {
    lambda.request.intent = highScore;
  } else if (argv[2] == 'help') {
    lambda.request.intent = help;
  } else if (argv[2] == 'fallback') {
    lambda.request.intent = fallback;
  } else if (argv[2] == 'stop') {
    lambda.request.intent = stop;
  } else if (argv[2] == 'cancel') {
    lambda.request.intent = cancel;
  } else if (argv[2] == 'reset') {
    lambda.request.intent = reset;
  } else if (argv[2] == 'yes') {
    lambda.request.intent = yes;
  } else if (argv[2] == 'no') {
    lambda.request.intent = no;
  }
  else {
    console.log(argv[2] + ' was not valid');
    return null;
  }

  // Write the last action
  fs.writeFile('lastaction.txt', JSON.stringify(lambda), (err) => {
    if (err) {
      console.log(err);
    }
  });

  return lambda;
}

function ssmlToText(ssml) {
  let text = ssml;

  // Replace break with ...
  text = text.replace(/<break[^>]+>/g, ' ... ');

  // Remove all other angle brackets
  text = text.replace(/<\/?[^>]+(>|$)/g, '');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// Simple response - just print out what I'm given
function myResponse(appId) {
  this._appId = appId;
}

function myResponse(err, result) {
  // Write the last action
  fs.writeFile('lastResponse.txt', JSON.stringify(result), (err) => {
    if (err) {
      console.log('ERROR; ' + err.stack);
    } else {
      if (result.sessionAttributes) {
        // Output the attributes
        const fs = require('fs');
        fs.writeFile(attributeFile, JSON.stringify(result.sessionAttributes), (err) => {
          if (err) {
            console.log(err);
          }
        });
        if (!process.env.NOLOG) {
          console.log('"attributes": ' + JSON.stringify(result.sessionAttributes));
        }
      }
      if (!result.response || !result.response.outputSpeech) {
        console.log('RETURNED ' + JSON.stringify(result));
      } else {
        if (result.response.outputSpeech.ssml) {
          console.log('AS SSML: ' + result.response.outputSpeech.ssml);
          console.log('AS TEXT: ' + ssmlToText(result.response.outputSpeech.ssml));
        } else {
          console.log(result.response.outputSpeech.text);
        }
        if (result.response.card && result.response.card.content) {
          console.log('Card Content: ' + result.response.card.content);
        }
        console.log('The session ' + ((!result.response.shouldEndSession) ? 'stays open.' : 'closes.'));
      }
    }
  });
}

// Build the event object and call the app
if ((process.argv.length == 3) && (process.argv[2] == 'clear')) {
  const fs = require('fs');

  // Clear is a special case - delete this entry from the DB and delete the attributes.txt file
  dynamodb.deleteItem({TableName: 'Slots', Key: { userId: {S: 'not-amazon'}}}, function (error, data) {
    console.log("Deleted " + error);
    if (fs.existsSync(attributeFile)) {
      fs.unlinkSync(attributeFile);
    }
  });
} else {
  var event = BuildEvent(process.argv);
  if (event) {
      mainApp.handler(event, null, myResponse);
  }
}
