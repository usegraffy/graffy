import { merge, slice, setVersion, makeWatcher } from '@graffy/common';
// import { debug } from '@graffy/testing';

export default function () {
  return (store) => {
    const state = [{ key: '', end: '\uffff', version: 0 }];
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
