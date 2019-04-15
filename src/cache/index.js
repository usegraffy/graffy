import { merge, getUnknown } from '@graffy/common';
import Cache from './Cache';

module.exports = function(cacheOptions = {}) {
  return store => {
    let mainCache = new Cache(store, cacheOptions);

    store.on('get', [], async (query, options, next) => {
      const [value = {}, unknown] = mainCache.getValue(query);
      if (!unknown) return value;
      let nextValue;
      try {
        nextValue = await next(unknown);
      } catch (e) {
        console.error('ERROR!!!', e.message, unknown);
        return;
      }
      mainCache.putValue(nextValue);
      merge(value, nextValue);
      return value;
    });

    store.on('sub', [], async function*(query, options, next) {
      let stream;

      // console.log('onSub called');

      if (options.skipCache) {
        stream = await next(query);
        // console.log('Result of calling next with ', query, 'is', stream);
        // We have to pull the first value from the stream to make sure the
        // stream is ready before we do a store.get()
        const firstValue = (await stream.next()).value || {};
        const unknown = getUnknown(firstValue, query);
        if (unknown) merge(firstValue, await store.get(unknown, { raw: true }));
        yield firstValue;
      } else {
        const cache = options.raw ? new Cache(store) : mainCache;
        stream = await cache.getStream(query);
      }

      yield* stream;
    });

    store.onPut((graph, options, next) => {
      mainCache.putValue(graph);
      return next(graph, options);
    });
  };
};
