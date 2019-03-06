import { sprout, prune, graft, getNode, cutQuery, merge } from '@grue/common';
import isEmpty from 'lodash/isEmpty';

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
    const data = await this.options.resolve(this.query);
    merge(data, this.earlyChange);
    this.data = prune(data, this.query);
    delete this.earlyChanges;
    this.push(getNode(graft(this.data), this.options.path));
  }

  async pub(change) {
    if (this.earlyChange) {
      merge(this.earlyChanges, change);
      return;
    }
    const { query, options, data } = this;

    // This line prunes the change object using any part of the tree that's currently
    // referenced from the query.
    change = merge(
      ...cutQuery(data, query).map(subQuery =>
        prune(change, subQuery, null, true),
      ),
    );

    if (isEmpty(change)) return;

    merge(data, change);
    console.log('START: Data after merge', data);
    const nextQuery = sprout(data, query);
    console.log('END: NextQuery', nextQuery);

    if (nextQuery) {
      const linked = await options.resolve(nextQuery);
      merge(data, linked);
      if (!options.values) merge(change, linked);
    }
    this.data = prune(data, query);
    this.push(
      options.values ? getNode(graft(this.data), options.path) : change,
    );
  }
}
