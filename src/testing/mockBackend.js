import { merge } from '@graffy/common';
import makeStream from '@graffy/stream';

export default function mockBackend(options = {}) {
  const state = [];
  const listeners = new Set();

  const get = jest.fn(() => state);

  const sub = jest.fn(() =>
    makeStream((push, _end) => {
      listeners.add(push);
      push(options.liveQuery ? state : undefined);
      return () => listeners.delete(push);
    }),
  );

  const put = jest.fn(change => {
    merge(state, change);
    for (const push of listeners) push(change);
  });

  return {
    get,
    sub,
    put,
    middleware: store => {
      store.onGet(get);
      store.onSub(sub);
      store.onPut(put);
    },
  };
}
