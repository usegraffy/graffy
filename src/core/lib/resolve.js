import { cap, sprout } from './tree';
import merge from './merge';
import isEqual from 'lodash/isEqual';

export const MAX_RECURSION = 10;

export default async function resolve(rootFuncs, type, initQuery, options) {
  let result = {};
  let rootQuery = initQuery;

  function buildChildren(query, funcs) {
    if (typeof query !== 'object' || !query) return;

    return Promise.all(
      Object.keys(query).map(
        key => key in funcs && build(query[key], funcs[key]),
      ),
    );
  }

  async function build(query, funcs) {
    const handle = funcs[type];
    if (!handle) return buildChildren(query, funcs);

    const res = await handle(rootQuery, options, query =>
      buildChildren(query, funcs),
    );

    merge(result, res);
  }

  let budget = MAX_RECURSION;
  while (rootQuery) {
    if (--budget < 0) throw new Error('resolve.max_recursion');
    await build(rootQuery, rootFuncs);
    const nextQuery = sprout(result, rootQuery);
    if (isEqual(nextQuery, rootQuery)) break;
    rootQuery = nextQuery;
  }

  return cap(result, initQuery);
}
