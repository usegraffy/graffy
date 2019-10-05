import { merge, slice } from '@graffy/common';

export default function() {
  return store => {
    const cache = [];

    store.on('get', [], async (query, options, next) => {
      if (options.skipCache) return next(query);
      const { known, unknown } = slice(cache, query);
      if (!unknown) return known;

      const nextValue = await next(unknown);
      merge(cache, nextValue);
      return merge(known || [], nextValue);
    });
  };
}
