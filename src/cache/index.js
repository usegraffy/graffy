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
        // eslint-disable-next-line no-console
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
        // TODO: We should be reusing the mainCache here when invalidation
        // is implemented.
        const cache = new Cache(store);
        try {
          for await (const _ of cache.getStream(query)) {
            // console.log('Change is', _, 'pushing', cache.getKnown(query));
            yield cache.getKnown(query);
          }
        } catch (e) {
          console.log('Error producing stream for subscriber', e);
        }
      }
    });

    store.onPut((graph, options, next) => {
      mainCache.putValue(graph);
      return next(graph, options);
    });
  };
}
