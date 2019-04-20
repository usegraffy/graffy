// Convert a raw response into a denormalized and easy-to-consume graph.

import { getNode } from '../path';
import { LINK_KEY, PAGE_KEY } from '../constants';

export default function graft(tree, root) {
  if (typeof tree !== 'object' || !tree) return tree;

  if (!root) root = tree;

  let empty = true;
  let result = {};

  if (tree[LINK_KEY]) {
    return graft(getNode(root, tree[LINK_KEY]), root);
  }

  if (tree[PAGE_KEY]) {
    Object.defineProperty(result, PAGE_KEY, { value: PAGE_KEY });
    empty = false;
  }

  for (const key in tree) {
    const branch = graft(tree[key], root);
    if (typeof branch === 'undefined') {
      delete tree[key];
    } else {
      result[key] = branch;
      empty = false;
    }
  }

  return empty ? undefined : result;
}
