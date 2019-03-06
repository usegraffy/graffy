import { sprout, prune, merge } from '@grue/common';

export const MAX_RECURSION = 10;

export default async function resolve(rootQuery, rootFuncs, type, token) {
  let layers;
  let result = {};
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
    rootQuery = sprout(result, rootQuery);
  }

  return result;
}

// Squashes layers into one (future) result tree.
function squash(layers) {
  if (!layers.length) return Promise.resolve();
  return Promise.all(layers).then(ls => merge({}, ...ls));
}
