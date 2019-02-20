export const PATH_SEPARATOR = '/';

export function makePath(path) {
  if (Array.isArray(path)) return path;
  if (typeof path !== 'string') throw Error('resolve.path');
  if (!path.length || path === PATH_SEPARATOR) return [];
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

export function wrap(query, path) {
  // return path.concat(query);
  for (let i = path.length - 1; i >= 0; i--) query = { [path[i]]: query };
  return query;
}
