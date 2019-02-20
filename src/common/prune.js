import merge from 'lodash.merge';
import { isSet, isRange, getMatches } from './range';
import { getNode, wrap } from './path';
import { LINK_KEY } from './constants';

// Removes branches that were not requested.
export default function prune(root, rootShape, path) {
  const layers = [];
  function doPrune(tree, query) {
    if (typeof tree !== 'object' || !tree) return tree;
    if (!query) throw Error('prune.query_falsy');
    if (typeof query !== 'object') return {};

    const link = tree[LINK_KEY];
    if (link) {
      if (!path) {
        layers.push(doPrune(root, wrap(query, link)));
        return tree;
      } else {
        tree = getNode(root, link);
      }
    }

    if (typeof tree === 'undefined' || tree === null) return;
    if (typeof tree !== 'object') return tree;

    const result = {};
    // Should we add metadata to mark nodes where we followed a link?
    // if (link) result[LINK_KEY] = link;
    function addResult(key, subShape) {
      if (isSet(key) || isRange(key)) {
        getMatches(tree, key).keys.forEach(k => addResult(k, subShape));

        // TODO: Populate tree[PAGE_KEY] using range and matches.

        return;
      }

      if (key in tree) {
        const r = doPrune(tree[key], subShape);
        if (typeof r !== 'undefined' && r !== null) result[key] = r;
      }
    }

    for (const key in query) addResult(key, query[key]);
    return result;
  }

  // If path is specified, links are grafted; return friendly version.
  if (path) return getNode(doPrune(root, rootShape), path);

  // Otherwise, return pruned tree from the root.
  layers.unshift(doPrune(root, rootShape));
  return merge({}, ...layers.filter(Boolean));
}
