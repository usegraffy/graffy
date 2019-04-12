import { unwrap, merge, mergeStreams } from '@graffy/common';
import isEqual from 'lodash/isEqual';

const MAX_RECURSIONS = 10;

export default async function resolve(handlers, firstPayload, options) {
  const results = [];
  let budget = MAX_RECURSIONS;
  let prevPayload = firstPayload;

  async function run(i, payload) {
    if (i >= handlers.length) {
      if (--budget === 0) throw Error('resolve.max_recursion');
      if (isEqual(payload, prevPayload)) {
        console.log('Unfulfilled', firstPayload, payload);
        throw Error('resolve.unfulfilled');
      }
      prevPayload = payload;
      return run(0, payload);
    }
    const { path, handle } = handlers[i];
    // console.log('Calling ', path, 'with', payload, unwrap(payload, path));
    if (!unwrap(payload, path)) return run(i + 1, payload);
    let returned = false;
    results.push(
      await handle(payload, options, nextPayload => {
        if (returned) throw Error('resolve.next_after_return: ' + handle.name);
        // console.log('Handler ', path, 'delegated', nextPayload);
        return run(i + 1, nextPayload);
      }),
    );
  }

  await run(0, firstPayload);
  return combineResults(results);
}

function combineResults(results) {
  if (results.length <= 1) return results[0];
  return results[0][Symbol.asyncIterator]
    ? mergeStreams(results)
    : merge({}, ...results);
}
