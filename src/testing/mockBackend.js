import { merge } from '@graffy/struct';
import makeStream from '@graffy/stream';

export default function mockBackend(options = {}) {
  const state = [];
  const listeners = new Set();

  function get() {
    return state;
  }

  function sub() {
    return makeStream((push, _end) => {
      listeners.add(push);
      push(options.liveQuery ? state : undefined);
      return () => listeners.delete(push);
    });
  }

  function put(change) {
    merge(state, change);
    for (const push of listeners) push(change);
  }

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
