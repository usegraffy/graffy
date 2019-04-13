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

  id = Symbol('Cache ID');
  data = {};
  listeners = {};
  lastListenerId = 0;
  sumQuery = {};
  upstreamQuery = null;
  upstream = null;

  async resubscribe() {
    const query = simplifyQuery(this.sumQuery);
    console.log('Resubscribe: Making query', query, this.upstreamQuery);
    if (isEqual(this.upstreamQuery, query)) return;
    this.upstreamQuery = query;
    if (this.upstream) this.upstream.cancel();
    this.upstream = this.store.sub(query, { skipCache: this.id });
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

    console.log('getStream invoked', query);

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
    console.log('sumQuery', this.sumQuery);
    this.resubscribe();
    return stream;
  }

  async putStream(stream) {
    for await (const value of stream) this.putValue(value);
  }

  getValue(query) {
    /* Return resuts as well as "unknown" query */
    const value = getKnown(this.data, query);
    const unknown = getUnknown(this.data, query);
    console.log('getValue', query, this.data, value, unknown);
    return [value, unknown];
  }

  async putValue(value) {
    /*
      Merge value into cache, and get the change tree
      extraChanges = await normalizeSubscriptions()
      If raw, merge extraChanges into change and call listeners with that;
      Othersiwe, call listeners with values from cache
    */

    // console.log('PutValue', value);

    merge(this.data, value);
    const linkedQuery = subtractQueries(
      linkKnown(value, this.sumQuery),
      this.sumQuery,
    );
    const unknown = getUnknown(value, linkedQuery);

    if (unknown) {
      console.log('Unknown', unknown);
      // The change added a link to some data we don't have in the cache.
      // We need to fetch it, but we don't need to resubscribe; the existing
      // subscription now matches this data (via the link) and will send us
      // future updates.
      const linkedData = await this.store.get(unknown);
      merge(this.data, linkedData);
      merge(value, linkedData);
    }

    for (const id in this.listeners) {
      const { originalQuery, push } = this.listeners[id];
      let { query } = this.listeners[id];
      if (!hasKnown(value, query)) continue;
      if (linkedQuery) {
        query = this.listeners[id].query = linkKnown(this.data, originalQuery);
      }
      push(getKnown(this.data, query));
    }
  }
}
