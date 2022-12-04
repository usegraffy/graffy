import {
  merge,
  slice,
  setVersion,
  makeWatcher,
  MIN_KEY,
  MAX_KEY,
} from '@graffy/common';

export default function () {
  return (store) => {
    const state = [{ key: MIN_KEY, end: MAX_KEY, version: 0 }];
    const watcher = makeWatcher();

    store.on('read', [], async (query) => {
      return setVersion(slice(state, query).known, Date.now());
    });

    store.on('watch', [], () => watcher.watch(undefined));

    store.on('write', [], async (change) => {
      merge(state, change);
      watcher.write(change);
      return change;
    });
  };
}
