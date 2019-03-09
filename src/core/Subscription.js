import { sprout, prune, graft, strike, merge } from '@grue/common';

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

    return(val) {
      done = true;
      close(val);
    },
    [Symbol.iterator]() {
      return this;
    },
  };
}

export default class Subscription {
  constructor(query, options) {
    this.query = query;
    this.options = options;

    this.stream = makeStream(push => {
      this.push = push;
      return options.onClose;
    });

    this.earlyChange = {};

    this.init();
  }

  async init() {
    // We need this line to be a separate function because the
    // constructor can't be async. We're okay even if pub is
    // called before this happens.
    const { options, query } = this;
    let data = await options.resolve(query);
    merge(data, this.earlyChange);

    // TODO: Properly resolve, prune etc. after early changes are merged.

    delete this.earlyChange;
    this.data = data = prune(data, query) || {};
    this.push(options.values ? graft(data, query) || {} : data);
  }

  async pub(change) {
    if (this.earlyChange) {
      merge(this.earlyChanges, change);
      return;
    }
    const { query, options, data } = this;

    // Returns early if the change does not have any overlap with the query.
    // DO NOT prune the change to only those changes that overlap; when the
    // overlapping portion includes a deletion in a range, the change set
    // may contain additional items to make up.
    if (!prune(change, strike(data, query))) return;

    merge(data, change);

    const nextQuery = sprout(data, query);

    if (nextQuery) {
      const linked = await options.resolve(nextQuery);
      merge(data, linked);
      if (!options.values) merge(change, linked);
    }
    this.data = prune(data, query);
    this.push(options.values ? graft(this.data, query) || {} : change);
  }
}
