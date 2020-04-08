import mergeIterators from 'merge-async-iterators';
import { makeStream } from '@graffy/stream';

export default function(collectionPath, map) {
  return store => {
    const { root, path } = store;
    const listeners = {};

    function consumeNextStream(nextStream) {}

    function addListener(keys, listener) {
      for (const key of keys) {
        if (!listeners[key]) listeners[key] = Set();
        listeners[key].add(listener);
      }
    }

    function removeListener(keys, listener) {
      for (const key of keys) {
        if (!listeners[key]) continue;
        listeners[key].delete(listener);
        if (!listeners[key].size) delete listeners[key];
      }
    }

    store.on('watch', [], (query, options, next) => {
      const keys = query.map(({ key }) => key);

      return makeStream((push, _end) => {
        const nextStream = next(query);
        addListener(keys, push);
        return () => removeListener(keys, push);
      });
    });

    const stream = root.call('watch');
  };
}
