export const PATH_SEPARATOR = '/';
export const RANGE_PATTERN = /^([^*]*)(\*+)([^*]*)(\**)([^*]*)$/;

export function makePath(path) {
  if (Array.isArray(path)) return path;
  if (typeof path !== 'string') throw Error('resolve.path');
  if (!path.length) return [];
  return path.split(PATH_SEPARATOR);
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
  for (let i = path.length - 1; i >= 0; i--) shape = { [path[i]]: shape };
  return shape;
}

export function isRange(key) {
  return !!key.match(RANGE_PATTERN);
}

export function getRange(key) {
  const match = key.match(RANGE_PATTERN);
  if (!match) return null;

  // eslint-disable-next-line no-unused-vars
  const [ _, a, l, b, r, c ] = match;
  const int = s => parseInt(s, 10);
  if (l === '**' && a && c) return { after: a, before: c, last: int(b) };
  if (r === '**' && c) return { after: a, before: c, first: int(b) };
  if (l === '**' && b && c) return { before: c, last: int(b) };
  if (r === '**') return { after: a, first: int(b) };
  if (l === '**' && b) return { last: int(b) };
  if (l === '**') return { first: int(a) };
  if (a && c) return { last: int(a), first: int(c), around: b };
  // if (r && c) return { first: int(c), after: b };
  // if (r) return { last: int(a), after: b };
  if (a && b) return { after: a, before: b };
  if (a) return { after: a };
  if (b) return { before: b };
  return { all: true };
}
