import { merge } from '@graffy/common';
import Cache from './Cache';

export default function(cacheOptions = {}) {
  return store => {
    let mainCache = new Cache(store, cacheOptions);

    store.on('get', [], async (query, options, next) => {
      if (options.skipCache) return next(query);
      const value = mainCache.getKnown(query) || {};
      const unknown = mainCache.getUnknown(query);
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
      if (options.skipCache) {
        yield* await next(query);
      } else if (options.raw) {
        yield* new Cache(store).getStream(query);
      } else {
        for await (const _ of mainCache.getStream(query)) {
          // console.log('Change is', _, 'pushing', mainCache.getKnown(query));
          yield mainCache.getKnown(query);
        }
      }
    });

    store.onPut((graph, options, next) => {
      mainCache.putValue(graph);
      return next(graph, options);
    });
  };
}
