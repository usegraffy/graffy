import merge from 'lodash/merge';
import isEmpty from 'lodash/isEmpty';
import { isSet, isRange, getMatches } from '../range';
import { getNode, wrap } from '../path';
import { LINK_KEY, PAGE_KEY, GONE_KEY } from '../constants';

// Removes branches that were not requested.
export default function prune(root, rootQuery, path) {
  const layers = [];
  function doPrune(tree, query) {
    if (typeof tree !== 'object' || !tree) return tree;
    if (!query) throw Error('prune.query_falsy');
    if (typeof query !== 'object') return null;

    const link = tree[LINK_KEY];
    if (link) {
      if (!path) {
        layers.push(doPrune(root, wrap(query, link)));
        return tree;
      } else {
        tree = getNode(root, link);
      }
    }

    if (typeof tree === 'undefined' || tree === null)
      return { [GONE_KEY]: true };
    if (typeof tree !== 'object') return tree;

    const result = {};
    // TODO: Should we add metadata to mark nodes where we followed a link?
    // if (link) result[LINK_KEY] = link;
    function addResult(key, subQuery) {
      if (isSet(key) || isRange(key)) {
        const { keys, known } = getMatches(tree, key);
        keys.forEach(k => addResult(k, subQuery));
        tree[PAGE_KEY] = known;
        return;
      }

      if (key in tree) {
        const r = doPrune(tree[key], subQuery);
        if (typeof r !== 'undefined' && r !== null) result[key] = r;
      }
    }

    for (const key in query) addResult(key, query[key]);
    return isEmpty(result) ? null : result;
  }

  // If path is specified, links are grafted; return friendly version.
  if (path) return getNode(doPrune(root, rootQuery), path);

  // Otherwise, return pruned tree from the root.
  layers.unshift(doPrune(root, rootQuery));
  return merge({}, ...layers.filter(Boolean));
}
