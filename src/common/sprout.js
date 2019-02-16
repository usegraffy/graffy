import merge from 'lodash.merge';
import { wrap } from './path';
import { isSet, isRange, getMatches } from './range';
import { getLink } from './link';

export default function sprout(root, rootShape) {
  let layers = [];
  function doSprout(tree, shape) {
    // console.log('sprout called', tree, shape, nextShape);
    if (typeof shape !== 'object' || !shape) return;
    const link = getLink(tree);
    if (link) {
      layers.push(wrap(shape, link));
      return nextShape;
    }
    if (typeof tree !== 'object' || !tree) {
      // return { tree, nextShape };
      throw new Error('sprout.tree_scalar');
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

    for (const key in shape) addResult(key, shape[key]);
  }

  doSprout(root, rootShape, []);
  const nextShape = merge(...layers);
  // Return undefined if nextShape is empty.
  for (const _ in nextShape) return nextShape;
}
