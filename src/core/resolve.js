import { unwrap } from '@graffy/struct';
import isEqual from 'lodash/isEqual';

const MAX_RECURSIONS = 10;

export default function resolve(handlers, firstPayload, options) {
  let budget = MAX_RECURSIONS;
  let prevPayload = firstPayload;

  if (!handlers) throw Error('no handlers');

  // console.log('Resolve called with', firstPayload);

  function run(i, payload) {
    // console.log('Calling handler', i + 1, '/', handlers.length, payload);
    if (i >= handlers.length) {
      if (--budget === 0) throw Error('resolve.max_recursion');
      if (isEqual(payload, prevPayload)) {
        // console.log('Unfulfilled', firstPayload, payload);
        throw Error('resolve.unfulfilled ' + i + ' ' + JSON.stringify(payload));
      }
      prevPayload = payload;
      return run(0, payload);
    }
    const { path, handle } = handlers[i];
    // console.log('Checking ', payload, path, unwrap(payload, path));
    if (!unwrap(payload, path)) return run(i + 1, payload);
    let nextCalled = false;
    // console.log(path, 'invoke', payload, unwrap(payload, path));
    return handle(payload, options, nextPayload => {
      if (nextCalled) throw Error('resolve.duplicate_next: ' + handle.name);
      nextCalled = true;
      return run(i + 1, nextPayload);
    });
  }

  return run(0, firstPayload);
}
