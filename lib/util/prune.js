import merge from 'lodash.merge';
import { isSet, getMatches } from './range';
import { makePath, getNode, wrap } from './path';

// Removes branches that were not requested.
export default function prune(root, rootShape, path = [], keepLinks = false) {
  const layers = [];
  function doPrune(tree, shape) {
    if (typeof shape !== 'object' || !shape) {
      if (!shape) throw Error('prune.shape_falsy');
      return typeof tree !== 'object' ? tree : {};
    }

    if (typeof tree === 'string' || Array.isArray(tree)) {
      const link = makePath(tree);
      if (keepLinks) {
        layers.push(doPrune(root, wrap(shape, link)));
        return tree;
      } else {
        tree = getNode(root, link);
        // console.log('Resolved', link, tree);
      }
    }

    if (typeof tree === 'undefined' || tree === null) return;
    if (typeof tree !== 'object') return tree;

    const result = {};
    function addResult(key, subShape) {
      if (isSet(key)) {
        getMatches(tree, key).forEach(k => addResult(k, subShape));
        return;
      }

      if (key in tree) {
        const r = doPrune(tree[key], subShape);
        if (typeof r !== 'undefined' && r !== null) result[key] = r;
      }
    }

    for (const key in shape) addResult(key, shape[key]);
    return result;
  }

  layers.unshift(doPrune(root, rootShape));
  return getNode(merge(...layers.filter(Boolean)), path);
}
