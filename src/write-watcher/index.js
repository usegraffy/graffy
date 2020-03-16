import { mergeStreams } from '@graffy/common';
import { makeStream } from '@graffy/stream';

export default function({ final } = {}) {
  return store => {
    const listeners = new Set();

    store.on('watch', [], (query, options, next) => {
      const writeStream = makeStream((push, _end) => {
        push(undefined);
        listeners.add(push);
        return () => listeners.delete(push);
      });

      return final ? writeStream : mergeStreams(writeStream, next(query));
    });

    store.on('write', [], async (change, options, next) => {
      const appliedChange = await next(change);
      for (const push of listeners) push(appliedChange);
      return appliedChange;
    });
  };
}
