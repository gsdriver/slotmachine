var mainApp = require('../index');

const attributeFile = 'attributes.txt';

function BuildEvent(argv)
{
  // Templates that can fill in the intent
  var bet = {'name': 'BetIntent', 'slots': {'Amount': {'name': 'Amount', 'value': ''}}};
  var spin = {'name': 'SpinIntent', 'slots': {}};
  var select = {'name': 'SelectIntent', 'slots': {}};
  var rules = {'name': 'RulesIntent', 'slots': {'Rules': {'name': 'Rules', 'value': ''}}};
  var reset = {'name': 'ResetIntent', 'slots': {}};
  var yes = {'name': 'AMAZON.YesIntent', 'slots': {}};
  var no = {'name': 'AMAZON.NoIntent', 'slots': {}};
  var help = {'name': 'AMAZON.HelpIntent', 'slots': {}};
  var stop = {'name': 'AMAZON.StopIntent', 'slots': {}};
  var cancel = {'name': 'AMAZON.CancelIntent', 'slots': {}};

  var lambda = {
    "session": {
      "sessionId": "SessionId.c88ec34d-28b0-46f6-a4c7-120d8fba8fa7",
      "application": {
        "applicationId": "amzn1.ask.skill.dcc3c959-8c93-4e9a-9cdf-ccdccd5733fd"
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
      "locale": "en-US",
      "timestamp": "2016-11-03T21:31:08Z",
      "intent": {}
    },
    "version": "1.0"
  };

  var openEvent = {
    "session": {
      "sessionId": "SessionId.c88ec34d-28b0-46f6-a4c7-120d8fba8fa7",
      "application": {
        "applicationId": "amzn1.ask.skill.dcc3c959-8c93-4e9a-9cdf-ccdccd5733fd"
      },
      "attributes": {},
      "user": {
        "userId": "not-amazon",
      },
      "new": true
    },
    "request": {
      "type": "LaunchRequest",
      "requestId": "EdwRequestId.26405959-e350-4dc0-8980-14cdc9a4e921",
      "locale": "en-US",
      "timestamp": "2016-11-03T21:31:08Z",
      "intent": {}
    },
    "version": "1.0"
  };

  // If there is an attributes.txt file, read the attributes from there
  const fs = require('fs');
  if (fs.existsSync(attributeFile)) {
    data = fs.readFileSync(attributeFile, 'utf8');
    if (data) {
      lambda.session.attributes = JSON.parse(data);
      openEvent.session.attributes = JSON.parse(data);
    }
  }

  // If there is no argument, then we'll just return
  if (argv.length <= 2) {
    console.log('I need some parameters');
    return null;
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
  } else if (argv[2] == 'spin') {
    lambda.request.intent = spin;
  } else if (argv[2] == 'select') {
    lambda.request.intent = select;
  } else if (argv[2] == 'launch') {
    return openEvent;
  } else if (argv[2] == 'help') {
    lambda.request.intent = help;
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

  return lambda;
}

// Simple response - just print out what I'm given
function myResponse(appId) {
  this._appId = appId;
}

myResponse.succeed = function(result) {
  if (result.response.outputSpeech.ssml) {
    console.log('AS SSML: ' + result.response.outputSpeech.ssml);
  } else {
    console.log(result.response.outputSpeech.text);
  }
  if (result.response.card && result.response.card.content) {
    console.log('Card Content: ' + result.response.card.content);
  }
  console.log('The session ' + ((!result.response.shouldEndSession) ? 'stays open.' : 'closes.'));
  if (result.sessionAttributes) {
    // Output the attributes too
    const fs = require('fs');
    fs.writeFile(attributeFile, JSON.stringify(result.sessionAttributes), (err) => {
      if (!process.env.NOLOG) {
        console.log('attributes:' + JSON.stringify(result.sessionAttributes) + ',');
      }
    });
  }
}

myResponse.fail = function(e) {
  console.log(e);
}

// Build the event object and call the app
var event = BuildEvent(process.argv);
if (event) {
    mainApp.handler(event, myResponse);
}