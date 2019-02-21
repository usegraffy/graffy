import { wrap } from '../path';
import { isSet, isRange, getMatches } from '../range';
import { LINK_KEY } from '../constants';

export default function cutQuery(root, rootQuery) {
  let layers = [ rootQuery ];
  function doCut(tree, query) {
    if (typeof tree !== 'object' || !tree) return;
    if (typeof query !== 'object' || !query) return;

    const link = tree[LINK_KEY];
    if (link) {
      layers.push(wrap(query, link));
      return;
    }

    function addResult(key, subQuery) {
      if (isSet(key) || isRange(key)) {
        getMatches(tree, key).keys.forEach(k => addResult(k, subQuery));
        return;
      }

      if (key in tree) {
        doCut(tree[key], subQuery);
      }
    }

    for (const key in query) addResult(key, query[key]);
  }

  doCut(root, rootQuery);
  return layers;
}
