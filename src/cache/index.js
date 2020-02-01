import { merge, slice, setVersion } from '@graffy/common';
import makeStream from '@graffy/stream';
// import { debug } from '@graffy/testing';

export default function({ final } = {}) {
  return store => {
    const state = final ? [{ key: '', end: '\uffff', version: 0 }] : [];
    const listeners = new Set();

    store.on('read', [], async (query, options, next) => {
      if (options.skipCache) return next(query);
      const { known, unknown } = slice(state, query);
      if (final) return setVersion(known, Date.now());
      if (!unknown) return known;

      const nextValue = await next(unknown);
      merge(state, nextValue);
      return merge(known || [], nextValue);
    });

    store.on('watch', [], (query, options, next) => {
      if (!final) return next();

      return makeStream((push, _end) => {
        push(undefined);
        listeners.add(push);
        return () => listeners.delete(push);
      });
    });

    store.on('write', [], async (change, options, next) => {
      const appliedChange = final ? change : await next(change);
      merge(state, appliedChange);
      for (const push of listeners) push(appliedChange);
      return appliedChange;
    });
  };
}
