import { merge, makeWatcher } from '@graffy/common';

export default function mockBackend(options = {}) {
  const state = [];
  const watcher = makeWatcher();

  const backend = {
    state,
    read: () => state,
    watch: () => watcher.watch(options.liveQuery ? state : undefined),
    write: (change) => {
      // change = setVersion(change, Date.now());
      merge(state, change);
      watcher.write(change);
      return change;
    },
  };

  // Note, the read, write and watch functions may be overwritten by tests
  // before the middleware is mounted.
  backend.middleware = (store) => {
    store.on('read', backend.read);
    store.on('watch', backend.watch);
    store.on('write', backend.write);
  };

  return backend;
}
