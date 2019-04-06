import { deepEqual } from 'lodash/deepEqual';
import { makeStream, merge } from '@graffy/common';
import { addQueries, subtractQueries, simplifyQuery } from './queryOperations';
import { linkKnown, hasKnown, getKnown, getUnknown } from './cacheOperations';

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
    if (deepEqual(this.upstreamQuery, query)) return;
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

    const id = this.lastListenerId++;
    const [stream, push] = makeStream(() => {
      delete this.listeners[id];
      this.sumQuery = subtractQueries(this.sumQuery, query);
      return this.resubscribe();
    });

    this.listeners[id] = {
      originalQuery: query,
      query: linkKnown(query, this.data),
      push,
    };
    this.sumQuery = addQueries(this.sumQuery, query);
    this.resubscribe();
    return stream;
  }

  async putStream(stream) {
    for await (const value of stream) this.putValue(value);
  }

  async getValue(query) {
    /* Return resuts as well as "unknown" query */
    const value = getKnown(query, this.data);
    const unknown = getUnknown(query, this.data);
    return [value, unknown];
  }

  async putValue(value) {
    /*
      Merge value into cache, and get the change tree
      extraChanges = await normalizeSubscriptions()
      If raw, merge extraChanges into change and call listeners with that;
      Othersiwe, call listeners with values from cache
    */

    merge(this.data, value);
    const linkedQuery = subtractQueries(
      linkKnown(this.sumQuery, value),
      this.sumQuery,
    );
    const unknown = getUnknown(linkedQuery, value);

    if (unknown) {
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
      if (!hasKnown(query, value)) continue;
      if (linkedQuery) {
        query = this.listeners[id].query = linkKnown(originalQuery, this.data);
      }
      push(getKnown(query, this.data));
    }
  }
}
