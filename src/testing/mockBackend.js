import { merge } from '@graffy/common';
import { makeStream } from '@graffy/stream';

export default function mockBackend(options = {}) {
  const state = [];
  const listeners = new Set();

  const backend = {
    state,
    read: () => state,
    watch: () =>
      makeStream((push, _end) => {
        listeners.add(push);
        push(options.liveQuery ? state : undefined);
        return () => listeners.delete(push);
      }),
    write: change => {
      merge(state, change);
      for (const push of listeners) push(change);
      return change;
    },
  };

  // Note, the read, write and watch functions may be overwritten by tests
  // before the middleware is mounted.
  backend.middleware = store => {
    store.on('read', backend.read);
    store.on('watch', backend.watch);
    store.on('write', backend.write);
  };

  return backend;
}
