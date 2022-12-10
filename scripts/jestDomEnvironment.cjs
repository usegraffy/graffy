const BaseEnvironment = require('jest-environment-jsdom').TestEnvironment;

class DomEnvironment extends BaseEnvironment {
  constructor(config, context) {
    super(config, context);
  }

  async setup() {
    await super.setup();
    this.global.TextDecoder = TextDecoder;
    this.global.TextEncoder = TextEncoder;
  }
}

module.exports = DomEnvironment;
