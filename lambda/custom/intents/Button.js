//
// Handles an Echo button being pressed
//

'use strict';

const utils = require('../utils');
const buttons = require('../buttons');

module.exports = {
  handleIntent: function() {
    const buttonId = buttons.getPressedButton(this.event.request, this.attributes);

    if (buttonId) {
      // We'll allow them to press this button again and disable the others
      this.attributes.usedButton = true;
      buttons.startInputHandler(this);

      // If they pressed a different button than the one they did before, ignore it
      if (!this.attributes.temp.buttonId || (buttonId == this.attributes.temp.buttonId)) {
        this.attributes.temp.buttonId = buttonId;
        this.emitWithState('SpinIntent');
      }
    }
  },
};
