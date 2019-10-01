// import mergeStreams from 'merge-async-iterators';
// import { merge, wrap, unwrap, remove, makePath } from '@graffy/common';
// import { decorate } from '@graffy/common';

import { unwrap } from '@graffy/common';

function resolve(handlers, firstPayload, options) {
  if (!handlers) throw Error('no handlers');

  function run(i, payload) {
    if (i >= handlers.length) {
      throw Error('resolve.unfulfilled ' + JSON.stringify(payload));
    }

    const { path, handle } = handlers[i];

    if (!unwrap(payload, path)) return run(i + 1, payload);

    let nextCalled = false;
    return handle(payload, options, nextPayload => {
      if (nextCalled) throw Error('resolve.duplicate_next: ' + handle.name);
      nextCalled = true;
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

  call(type, payload, options) {
    return resolve(this.handlers[type], payload, options);
  }
}
