export default class AsyncInterator {
  constructor(fn) {
    this.close = fn(this.push);
    this.payloads = [];
    this.requests = [];
  }

  push = payload => {
    if (this.requests.length) {
      const request = this.requests.shift();
      request(payload);
    } else {
      this.payloads.push(payload);
    }
  }

  next() {
    if (this.payloads.length) {
      const payload = this.payloads.shift();
      return Promise.resolve(payload);
    }
    return new Promise(resolve => {
      this.requests.push(resolve);
    });
  }

  return(val) { this.close(val); }
  throw(err) { this.close(err); }
  [Symbol.iterator]() { return this; }
}
