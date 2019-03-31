import sortedIndex from 'lodash/sortedIndex';
import { PAGE_KEY } from './constants';

export const PATH_SEPARATOR = '/';

export function makePath(path) {
  if (Array.isArray(path)) return path;
  if (typeof path !== 'string') throw Error('resolve.path');
  if (!path.length || path === PATH_SEPARATOR) return [];
  if (path[0] !== PATH_SEPARATOR) throw Error('resolve.path');
  return path.split(PATH_SEPARATOR).slice(1);
}

function known(node, key) {
  if (!node[PAGE_KEY] || !node[PAGE_KEY].length) return;
  const ix = sortedIndex(node[PAGE_KEY], key);
  return !(ix % 2);
}

export function getNode(tree, path) {
  for (const key of path) {
    if (!tree) return;
    if (!(key in tree)) return known(tree, key) ? null : undefined;
    tree = tree[key];
  }
  return tree;
}

export function makeNode(tree, path) {
  for (const key of path) {
    if (typeof tree[key] !== 'object' || !tree[key]) tree[key] = {};
    tree = tree[key];
  }
  return tree;
}

export function wrap(query, path) {
  // return path.concat(query);
  for (let i = path.length - 1; i >= 0; i--) query = { [path[i]]: query };
  return query;
}
