import { sprout, prune, overlaps } from '@grue/common';
import merge from 'lodash.merge';

export function makeStream(fn) {
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
  constructor(query, options) {
    this.query = query;
    this.options = options;

    this.data = this.options.resolve(this.query);
    this.stream = makeStream(push => {
      this.push = push;
      return options.onClose;
    });

    this.earlyPayloads = [];

    this.init();
  }

  async init() {
    // We need this line to be a separate function because the
    // constructor can't be async. We're okay even if pub is
    // called before this happens.
    const data = await this.data;
    for (const change of this.earlyPayloads) merge(data, change);
    this.data = prune(data, this.query);
    delete this.earlyPayloads;
    this.push(this.data);
  }

  async pub(change) {
    if (this.earlyPayloads) {
      this.earlyPayloads.push(change);
      return;
    }
    const { query, options, data } = this;
    if (!overlaps(query, data, change) && !overlaps(data, change)) return;

    merge(data, change);
    const nextQuery = sprout(data, query);

    if (nextQuery){
      console.log('Next query made', change, data, query, nextQuery);
      const linked = await options.resolve(nextQuery);
      merge(data, linked);
      if (!options.values) merge(change, linked);
    }
    this.data = prune(data, query);
    this.push(options.values ? prune(this.data, query, options.path) : change);
  }
}
