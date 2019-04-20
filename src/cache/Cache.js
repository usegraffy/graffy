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
        console.log('Error fetching fillData for', value);
        console.log('this.data', this.data);
        console.log('gaps', gaps);
        console.log('this.sumQuery', this.sumQuery);
        console.error(e);
        // process.exit(-1);
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
      // if (
      //   value.visitors &&
      //   value.visitorsByTime &&
      //   payload &&
      //   (payload.visitors || payload.visitorsByTime) &&
      //   (!payload.visitors || !payload.visitorsByTime)
      // ) {
      //   console.error('Mismatched updates', {
      //     value,
      //     payload,
      //     lastQuery,
      //     nextQuery,
      //   });
      // }
      if (payload) push(payload);
    }

    // if (fillData) {
    //   merge(this.data, fillData);
    // }
  }
}
