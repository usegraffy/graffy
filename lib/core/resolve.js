import merge from 'lodash.merge';
import { sprout, wrap } from '../util';

export const MAX_RECURSION = 10;

export default async function resolve(rootShape, rootFuncs, type, token, result = {}) {
  // Invokes resolver functions and collects the returned trees into layers.
  function build(shape, funcs, result, path = [], layers = []) {
    if (funcs[type]) {
      layers.push(funcs[type]({ shape: wrap(shape, path), token }));
    }

    if (typeof shape !== 'object' || !shape) return;

    for (let key in shape) {
      if (key in funcs) {
        build(
          shape[key],
          funcs[key],
          result && typeof result === 'object' ? result[key] : undefined,
          path.concat(key),
          layers
        );
      }
    }
    return layers;
  }

  let budget = MAX_RECURSION;
  while (rootShape) {
    if (--budget < 0) throw new Error('resolve.max_recursion');
    const layers = build(rootShape, rootFuncs);
    merge(result, await squash(layers));
    rootShape = sprout(result, rootShape);
  }

  return result;
}

// Squashes layers into one (future) result tree.
function squash(layers) {
  if (!layers.length) return Promise.resolve();
  return Promise.all(layers).then(ls => merge({}, ...ls));
}
