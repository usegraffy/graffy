import { unwrap, merge, mergeStreams } from '@graffy/common';
import isEqual from 'lodash/isEqual';

const MAX_RECURSIONS = 10;

export default async function resolve(handlers, firstPayload, options) {
  const results = [];
  let budget = MAX_RECURSIONS;
  let prevPayload = firstPayload;

  // console.log('Resolve called with', firstPayload);

  async function run(i, payload) {
    // console.log('Calling handler', i + 1, '/', handlers.length);
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
    // console.log(path, 'invokes', payload, unwrap(payload, path));
    if (!unwrap(payload, path)) return run(i + 1, payload);
    let returned = false;
    let value = await handle(payload, options, nextPayload => {
      // if (returned) throw Error('resolve.next_after_return: ' + handle.name);
      // console.log(path, 'delegates', nextPayload);
      return run(i + 1, nextPayload);
    });
    returned = true;
    // console.log(path, 'returns', value);
    return value;
  }

  return await run(0, firstPayload);
}

// function combineResults(results) {
//   if (results.length <= 1) return results[0];
//   return results[0][Symbol.asyncIterator]
//     ? mergeStreams(results)
//     : merge({}, ...results);
// }
