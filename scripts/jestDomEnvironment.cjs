const BaseEnvironment = require('jest-environment-jsdom').TestEnvironment;

class DomEnvironment extends BaseEnvironment {
  async setup() {
    await super.setup();
    this.global.TextDecoder = TextDecoder;
    this.global.TextEncoder = TextEncoder;
  }
}

module.exports = DomEnvironment;
