import isEqual from 'lodash/isEqual';
import {
  makeStream,
  merge,
  addQueries,
  subtractQueries,
  simplifyQuery,
  linkKnown,
  hasKnown,
  getKnown,
  getUnknown,
} from '@graffy/common';

export default class Cache {
  constructor(store, cacheOptions) {
    this.store = store;
    this.cacheOptions = cacheOptions;
  }

  data = {};
  listeners = {};
  lastListenerId = 0;
  sumQuery = {};
  upstreamQuery = null;
  upstream = null;

  async resubscribe() {
    const query = linkKnown(this.data, simplifyQuery(this.sumQuery));
    if (isEqual(this.upstreamQuery, query)) return;
    this.upstreamQuery = query;
    if (this.upstream) this.upstream.return();
    this.upstream = this.store.sub(query, { skipCache: true, raw: true });
    this.putStream(this.upstream);
  }

  getStream(query) {
    /*
      Create a stream, which on end calls contractSubscriptions(query)
        Decrement sumQuery by Query, detecting if any leaves were removed
        If so, cancel and recreate upstream subscription
      Add the query and the stream's push function to listeners.
      expandSubscriptions(query);
        Increment sumQuery by query, detecting if any leaves were added
        If so, cancel and recreate upstream subscription

    */

    // console.log('getStream invoked', query);

    const id = this.lastListenerId++;
    const [push, stream] = makeStream(() => {
      delete this.listeners[id];
      this.sumQuery = subtractQueries(this.sumQuery, query);
      return this.resubscribe();
    });

    this.listeners[id] = {
      originalQuery: query,
      query: linkKnown(this.data, query),
      push,
    };
    this.sumQuery = addQueries(this.sumQuery, query);
    this.resubscribe();
    return stream;
  }

  async putStream(stream) {
    // TODO: Add backpressure here; pause pulling if all downstream listeners
    // are saturated.
    for await (const value of stream) this.putValue(value);
  }

  getKnown(query) {
    return getKnown(this.data, query);
  }

  getUnknown(query) {
    return getUnknown(this.data, query);
  }

  async putValue(value) {
    /*
      Merge value into cache, and get the change tree
      extraChanges = await normalizeSubscriptions()
      If raw, merge extraChanges into change and call listeners with that;
      Othersiwe, call listeners with values from cache
    */

    if (typeof value === 'undefined') value = {};
    merge(this.data, value);

    const unknown = getUnknown(this.data, this.sumQuery);
    if (unknown) {
      // The change added a link to some data we don't have in the cache.
      // We need to fetch it and also resubscribe.
      await this.resubscribe();
      const linkedData = await this.store.get(unknown, {
        skipCache: true,
        raw: true,
      });
      merge(this.data, linkedData);
      merge(value, linkedData);
    }

    for (const id in this.listeners) {
      const { originalQuery, push } = this.listeners[id];
      const query = linkKnown(this.data, originalQuery);
      if (!hasKnown(value, query)) continue;
      push(value);
    }
  }
}
