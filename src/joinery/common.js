import { _ } from './build';

export default function find(items, compare, first = 0, last = items.length) {
  while (first < last) {
    const ix = ((first + last) / 2) | 0;
    const d = compare(items[ix]);

    if (d < 0) {
      first = ix + 1;
    } else if (d > 0) {
      last = ix;
    } else {
      return ix;
    }
  }

  return first;
}

export function normalizePath(path) {
  return typeof path === 'string' ? path.split('.') : path;
}

export function wrap(tree, path) {
  path = normalizePath(path);
  if (!path.length) return tree;

  const meta = tree.meta;
  delete tree.meta;

  for (let i = path.length - 1; i >= 0; i--) {
    tree = _[path[i]](tree);
  }
  tree.meta = meta;

  return tree;
}

export function peel(tree, path) {
  path = normalizePath(path);
  let node = tree;
  for (const name of path) {
    const ix = find(node, ({ key }) => (key < name ? -1 : key > name ? 1 : 0));
    if (!node[ix] || node[ix].key !== name) return;
    node = node[ix];
  }
  return node;
}

export function isEmpty(object) {
  for (const _ in object) return false;
  return true;
}
