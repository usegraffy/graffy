import merge from 'lodash.merge';
import { isSet, isRange, getMatches } from './range';
import { getNode, wrap } from './path';
import { getLink, setLink } from './link';
import { META_KEY } from './constants';

// Removes branches that were not requested.
export default function prune(root, rootShape, path) {
  const layers = [];
  function doPrune(tree, shape) {
    if (typeof shape !== 'object' || !shape) {
      if (!shape) throw Error('prune.shape_falsy');
      return typeof tree !== 'object' ? tree : {};
    }

    const link = getLink(tree);
    if (link) {
      if (!path) {
        layers.push(doPrune(root, wrap(shape, link)));
        return tree;
      } else {
        tree = getNode(root, link);
      }
    }

    if (typeof tree === 'undefined' || tree === null) return;
    if (typeof tree !== 'object') return tree;

    const result = {};
    // Should we add metadata to mark nodes where we followed a link?
    // if (link) setLink(result, link);
    function addResult(key, subShape) {
      if (isSet(key) || isRange(key)) {
        getMatches(tree, key).keys.forEach(k => addResult(k, subShape));

        // TODO: Populate tree[PAGE_INFO] using range and matches.

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

  // If path is specified, links are grafted; return friendly version.
  if (path) return getNode(doPrune(root, rootShape), path);

  // Otherwise, return pruned tree from the root.
  layers.unshift(doPrune(root, rootShape));
  return merge(...layers.filter(Boolean));
}
