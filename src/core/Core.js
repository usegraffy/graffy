import { unwrap } from '@graffy/common';
import debug from 'debug';
// import { format } from '@graffy/testing';

const log = debug('graffy:core');

function resolve(handlers, firstPayload, options) {
  if (!handlers || !handlers.length) throw Error('resolve.no_provider');

  function run(i, payload) {
    if (i >= handlers.length) {
      throw Error('resolve.no_providers_for ' + JSON.stringify(payload));
    }

    const { path, handle } = handlers[i];
    if (!unwrap(payload, path)) return run(i + 1, payload);

    let nextCalled = false;
    return handle(payload, options, (nextPayload) => {
      if (nextCalled) {
        throw Error('resolve.duplicate_next_call: ' + handlers[i].name);
      }
      nextCalled = true;
      if (typeof nextPayload === 'undefined' || !nextPayload.length) return;
      return run(i + 1, nextPayload);
    });
  }

  return run(0, firstPayload);
}

export default class Core {
  constructor() {
    this.handlers = {};
  }

  on(type, path, handle) {
    this.handlers[type] = this.handlers[type] || [];
    this.handlers[type].push({ path, handle });
  }

  call(type, payload, options = {}) {
    log('call', type, payload);
    return resolve(this.handlers[type], payload, options);
  }
}
