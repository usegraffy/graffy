import { unwrap } from '@graffy/struct';

export default function resolve(handlers, firstPayload, options) {
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
