import merge from 'lodash.merge';
import { wrap, getNode } from './path';
import { isSet, isRange, getMatches } from './range';
import { LINK_KEY } from './constants';

export default function sprout(root, rootShape) {
  let layers = [];
  function doSprout(tree, query) {
    if (typeof tree !== 'object' || !tree) return;
    if (typeof query !== 'object' || !query) return;
    const link = tree[LINK_KEY];
    if (link) {
      tree = getNode(root, link);
      if (!tree) {
        layers.push(wrap(query, link));
        return;
      }
    }

    function addResult(key, subShape) {
      if (isSet(key) || isRange(key)) {
        getMatches(tree, key).keys.forEach(k => addResult(k, subShape));
        return;
      }

      if (key in tree) {
        doSprout(tree[key], subShape, nextShape);
      }
    }

    for (const key in query) addResult(key, query[key]);
  }

  doSprout(root, rootShape, []);
  const nextShape = merge({}, ...layers);
  // Return undefined if nextShape is empty.
  for (const _ in nextShape) return nextShape;
}
