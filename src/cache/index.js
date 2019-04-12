import { merge } from '@graffy/common';
import Cache from './Cache';

module.exports = function(cacheOptions = {}) {
  return store => {
    let mainCache = new Cache(store, cacheOptions);

    store.onGet(async (query, options, next) => {
      const [value, unknown] = mainCache.getValue(query);
      if (!unknown) return value;
      const nextValue = await next(unknown);
      mainCache.putValue(nextValue);
      return merge(value, nextValue);
    });

    store.onSub(async function*(query, options, next) {
      let stream;

      if (options.skipCache) {
        stream = await next(query);
        console.log('Result of calling next with ', query, 'is', stream);
        const firstValue = stream.next().value; // Ensure stream is ready
        yield store.get(query);
        yield firstValue;
      } else {
        const cache = options.raw ? new Cache(store) : mainCache;
        stream = await cache.getStream(query);
      }

      console.log('Stream', stream);

      yield* stream;
    });

    store.onPut((graph, options, next) => {
      mainCache.putValue(graph);
      return next(graph, options);
    });
  };
};
