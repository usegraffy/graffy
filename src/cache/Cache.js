import isEqual from 'lodash/isEqual';
import {
  makeStream,
  merge,
  addQueries,
  subtractQueries,
  simplifyQuery,
  linkKnown,
  // hasKnown,
  getKnown,
  getMaxKnown,
  getUnknown,
} from '@graffy/common';

let id = 0;

export default class Cache {
  constructor(store, cacheOptions) {
    this.store = store;
    this.cacheOptions = cacheOptions;
    this.id = id++;
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
    // console.log(this.id, 'value', value);

    const gaps = getUnknown(this.data, this.sumQuery);
    let fillData;
    if (gaps) {
      // The change added a link to some data we don't have in the cache.
      // We need to fetch it and also resubscribe.
      await this.resubscribe();
      try {
        fillData = await this.store.get(gaps, {
          skipCache: true,
          raw: true,
        });
      } catch (e) {
        console.error(e);
      }
      if (fillData) {
        merge(this.data, fillData);
        merge(value, fillData);
      }
    }

    for (const id in this.listeners) {
      const { lastQuery = {}, originalQuery, push } = this.listeners[id];
      const nextQuery = linkKnown(this.data, originalQuery);
      const query = addQueries(lastQuery, nextQuery);
      this.listeners[id].lastQuery = nextQuery;

      const payload = getKnown(value, query);
      if (payload) push(payload);
    }
  }
}
