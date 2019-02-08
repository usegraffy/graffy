import { immerge, prune, overlaps } from '@grue/common';

function makeStream(fn) {
  const payloads = [];
  const requests = [];
  let done = false;

  const push = payload => {
    if (done) return;
    payload = { value: payload, done: false };
    if (!requests.length) return payloads.push(payload);
    requests.shift()(payload);
  };
  const close = fn(push);

  return {
    next() {
      if (done) return Promise.resolve({ value: void 0, done: true });
      if (payloads.length) return Promise.resolve(payloads.shift());
      return new Promise(resolve => requests.push(resolve));
    },

    return(val) { done = true; close(val); },
    [Symbol.iterator]() { return this; }
  };
}

export default class Subscription {
  constructor(shape, path, options) {
    this.shape = shape;
    this.path = path;
    this.options = options;

    this.data = this.options.resolve(this.shape);
    this.stream = makeStream(push => {
      this.push = push;
      return options.onClose;
    });

    this.init();
  }

  async init() {
    // We need this line to be a separate function because the
    // constructor can't be async. We're okay even if pub is
    // called before this happens.
    this.push(prune(await this.data, this.shape, this.path));
  }

  async pub(change) {
    const { shape, path, options, data } = this;
    if (!overlaps(shape, change)) return;
    let payload;
    if (options.values) {
      payload = this.data = options.resolve(shape, immerge(await data, change));
    } else {
      payload = options.resolve(shape, change);
    }
    this.push(prune(await payload, shape, path, !!options.keepLinks));
  }
}
