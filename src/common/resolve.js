import { getNode } from './path';
import merge from './merge';
import isEqual from 'lodash/isEqual';

export const MAX_RECURSION = 10;

export default async function resolve(
  rootHandlers,
  type,
  initPayload,
  options,
) {
  let result = {};
  let rootPayload = initPayload;

  function buildChildren(path) {
    const payload = getNode(rootPayload, path);
    const handlers = getNode(rootHandlers, path);
    if (typeof payload !== 'object' || !payload) return;

    return Promise.all(
      Object.keys(payload).map(
        key => key in handlers && build(path.concat(key)),
      ),
    );
  }

  async function build(path) {
    const handlers = getNode(rootHandlers, path);
    const handle = handlers[type];
    if (!handle) return buildChildren(path);

    const res = await handle(rootPayload, options, newPayload => {
      rootPayload = newPayload;
      if (rootPayload) buildChildren(path);
    });

    merge(result, res);
  }

  let budget = MAX_RECURSION;
  let prevPayload = rootPayload;
  while (rootPayload) {
    if (--budget < 0) throw new Error('resolve.max_recursion');
    await build([]);
    if (isEqual(prevPayload, rootPayload)) break;
    prevPayload = rootPayload;
  }

  return result;
}
