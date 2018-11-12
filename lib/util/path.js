export const PATH_SEPARATOR = '/';

export function makePath(path) {
  if (Array.isArray(path)) return path;
  if (typeof path !== 'string') throw Error('resolve.path');
  if (!path.length) return [];
  if (path[0] !== PATH_SEPARATOR) throw Error('resolve.path');
  return path.split(PATH_SEPARATOR).slice(1);
}

export function getNode(tree, path) {
  for (const name of path) {
    if (!(name in tree)) return;
    tree = tree[name];
  }
  return tree;
}

export function makeNode(tree, path) {
  for (const name of path) {
    if (!(name in tree)) tree[name] = {};
    tree = tree[name];
  }
  return tree;
}

export function wrap(shape, path) {
  // return path.concat(shape);
  for (let i = path.length - 1; i >= 0; i--) shape = { [path[i]]: shape };
  return shape;
}
