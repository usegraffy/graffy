import merge from 'lodash.merge';

export const PATH_SEPARATOR = '/';
export const RANGE_PATTERN = /^([^*]*)(\*+)([^*]*)(\**)([^*]*)$/;
export const FN_QUERY = Symbol();

export class Grue {
  constructor() {
    this.ftree = {};
  }

  use(path, type, fn) {
    path = makePath(path);
    const node = makeNode(this.ftree, path);
    node[type] = fn;
  }

  get(shape) {
    return resolve(shape, FN_QUERY, this.ftree);
  }
}

function makePath(path) {
  if (Array.isArray(path)) return path;
  if (typeof path !== 'string') throw Error('resolve.path');
  if (!path.length) return [];
  return path.split(PATH_SEPARATOR);
}

function makeNode(tree, path) {
  for (const name of path) {
    if (!(name in tree)) tree[name] = {};
    tree = tree[name];
  }
  return tree;
}

function wrap(shape, path) {
  for (let i = path.length - 1; i >= 0; i--) shape = { [path[i]]: shape };
  return shape;
}


// eslint-disable-next-line no-unused-vars
function getRange([ _, a, l, b, r, c ]) {
  const int = s => parseInt(s, 10);
  if (l === '**') return { after: a, before: c, last: int(b) };
  if (r === '**') return { after: a, before: c, first: int(b) };
  if (a && c) return { last: int(a), first: int(c), around: b };
  if (r && c) return { first: int(c), after: b };
  if (r) return { last: int(a), after: b };
  if (a && b) return { after: a, before: b };
  if (a) return { after: a };
  if (b) return { before: b };
  return { all: true };
}

async function resolve(shape, type, funcs) {
  const result = {};
  while (shape) {
    const layers = build(shape, funcs, [], type);
    let rtree = await squash(layers);
    rtree = prune(rtree, shape);
    shape = sprout(rtree, shape);
    merge(result, rtree);
  }
  return result;
}

// Invokes resolver functions and collects the returned trees into layers.
function build(qtree, ftree, path, type, layers = []) {
  if (ftree[type]) layers.push(ftree[type](path, qtree));
  if (typeof qtree !== 'object' || !qtree) return;

  if (ftree['*']) {
    let items = Object.keys(qtree).map(key => {
      const range = key.match(RANGE_PATTERN);
      return range ? getRange(range) : key;
    });
    if (!items.length) return layers;
    const nshape = merge({}, ...Object.values(qtree));
    const npath = path.slice(0);
    npath.push(items.length === 1 ? items[0] : items);
    build(nshape, ftree['*'], npath, type, layers);
  }

  for (let key in qtree) {
    if (key === '*') continue;
    if (key in ftree) {
      build(qtree[key], ftree[key], path.concat(key), type, layers);
    }
  }
  return layers;
}

// Squashes layers into one (future) result tree.
function squash(layers) {
  if (layers.length <= 1) return Promise.resolve(layers[0]);
  return Promise.all(layers).then(ls => merge({}, ...ls));
}

// Follows symlinks to add extra branches.
function sprout(rtree, qtree, shape = {}) {
  // console.log('sprout called', rtree, qtree, shape);
  if (typeof qtree !== 'object' || !qtree) return;
  if (typeof rtree === 'string') {
    merge(shape, wrap(qtree, makePath(rtree)));
    return shape;
  }
  if (typeof rtree !== 'object' || !rtree) {
    // return { rtree, shape };
    throw new Error('resolve.sprout.rleaf');
  }

  for (const key in qtree) {
    const range = key.match(RANGE_PATTERN);
    if (range) { for (const rkey in rtree) {
      sprout(rtree[rkey], qtree[key], shape);
    }} else if (key in rtree) {
      sprout(rtree[key], qtree[key], shape);
    }
  }
  // Return undefined if shape is empty.
  for (const _ in shape) return shape;
}

// Removes branches that were not requested.
function prune(rtree, qtree) {
  if (typeof qtree !== 'object' || !qtree) {
    if (qtree) return rtree;
    throw new Error('resolve.prune.qleaf');
  }
  if (typeof rtree !== 'object' || !rtree) return rtree;

  const result = {};
  for (const key in qtree) {
    const range = key.match(RANGE_PATTERN);
    if (range) { for (const rkey in rtree) {
      result[rkey] = prune(rtree[rkey], qtree[key]);
    }} else if (key in rtree) {
      result[key] = prune(rtree[key], qtree[key]);
    }
  }
  return result;
}
