import { cap, sprout, prune } from './tree';
import merge from './merge';
import isEqual from 'lodash/isEqual';

export const MAX_RECURSION = 10;

export default async function resolve(initQuery, rootFuncs, type, token) {
  let layers;
  let result = {};
  let rootQuery = initQuery;
  // Invokes resolver functions and collects the returned trees into layers.
  function build(query, funcs) {
    if (funcs[type]) {
      layers.push(
        Promise.resolve(funcs[type]({ query: rootQuery, token })).then(tree =>
          prune(tree, rootQuery),
        ),
      );
    }

    if (typeof query !== 'object' || !query) return;

    for (let key in query) {
      if (key in funcs) {
        build(query[key], funcs[key]);
      }
    }
    return layers;
  }

  let budget = MAX_RECURSION;
  while (rootQuery) {
    if (--budget < 0) throw new Error('resolve.max_recursion');
    layers = [];
    build(rootQuery, rootFuncs);
    merge(result, await squash(layers));
    const nextQuery = sprout(result, rootQuery);
    if (isEqual(nextQuery, rootQuery)) break;
    rootQuery = nextQuery;
  }

  return cap(result, initQuery);
}

// Squashes layers into one (future) result tree.
function squash(layers) {
  if (!layers.length) return Promise.resolve();
  return Promise.all(layers).then(ls => merge({}, ...ls));
}
