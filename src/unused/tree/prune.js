import merge from '../merge';
import isEmpty from 'lodash/isEmpty';
import { isRange, splitRange } from '../range';
import { wrap } from '../path';
import { LINK_KEY, PAGE_KEY } from '../constants';

// Removes branches that were not requested.
export default function prune(root, rootQuery, isChange) {
  const layers = [];
  function doPrune(tree, query) {
    if (typeof tree !== 'object' || !tree) return tree;
    if (!query) throw Error('prune.query_falsy');
    if (typeof query !== 'object') return;

    const link = tree[LINK_KEY];
    if (link) {
      layers.push(doPrune(root, wrap(query, link)));
      return tree;
    }

    const result = {};
    function addResult(key, subQuery) {
      if (isRange(key)) {
        const { keys, known } = splitRange(tree, key);
        keys.forEach(k => addResult(k, subQuery));
        if (!isChange) result[PAGE_KEY] = known;
        return;
      }

      if (key in tree) {
        const r = doPrune(tree[key], subQuery);
        if (typeof r !== 'undefined') result[key] = r;
      }
    }

    for (const key in query) addResult(key, query[key]);
    return isEmpty(result) ? undefined : result;
  }

  // Otherwise, return pruned tree from the root.
  layers.unshift(doPrune(root, rootQuery));
  return merge({}, ...layers.filter(Boolean));
}
