import { makeWatcher, mergeStreams } from '@graffy/common';

export default function ({ final } = {}) {
  return (store) => {
    const watcher = makeWatcher();

    store.on('watch', [], (query, options, next) => {
      const writeStream = final ? watcher.watch(undefined) : watcher.watch([]);
      return final ? writeStream : mergeStreams(writeStream, next(query));
    });

    store.on('write', [], async (change, options, next) => {
      const appliedChange = await next(change);
      watcher.write(appliedChange);
      return appliedChange;
    });
  };
}
