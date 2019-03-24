import { cap, sprout } from './tree';
import merge from './merge';
import isEqual from 'lodash/isEqual';

export default async function distribute(initChange, rootFuncs, type, options) {
  let result = {};
  let rootChange = initChange;

  function buildChildren(change, funcs) {
    if (typeof change !== 'object' || !change) return;

    return Promise.all(
      Object.keys(change).map(
        key => key in funcs && build(change[key], funcs[key]),
      ),
    );
  }

  function build(change, funcs) {
    const handle = funcs[type];
    if (!handle) return buildChildren(change, funcs);

    return handle({ change: rootChange, options }, ({ change }) =>
      buildChildren(change, funcs),
    ).then(res => merge(result, res));
  }

  let budget = MAX_RECURSION;
  while (rootChange) {
    if (--budget < 0) throw new Error('resolve.max_recursion');
    await build(rootChange, rootFuncs);
    const nextdChange = sprout(result, rootChange);
    if (isEqual(nextdChange, rootChange)) break;
    rootChange = nextdChange;
  }

  return cap(result, initChange);
}
