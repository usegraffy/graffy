import { merge } from '@graffy/common';
import makeStream from '@graffy/stream';

export default function mockBackend(options = {}) {
  const state = [];
  const listeners = new Set();

  const read = jest.fn(() => state);

  const watch = jest.fn(() =>
    makeStream((push, _end) => {
      listeners.add(push);
      push(options.liveQuery ? state : undefined);
      return () => listeners.delete(push);
    }),
  );

  const write = jest.fn(change => {
    merge(state, change);
    for (const push of listeners) push(change);
  });

  return {
    read,
    watch,
    write,
    middleware: store => {
      store.on('read', read);
      store.on('watch', watch);
      store.on('write', write);
    },
  };
}
