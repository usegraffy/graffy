import merge from 'lodash.merge';

export const PATH_SEPARATOR = '/';
export const RANGE_PATTERN = /^([^*]*)(\*+)([^*]*)(\**)([^*]*)$/;
export const GET = Symbol();
export const SET = Symbol();
export const ON = Symbol();

export class Grue {
  constructor() {
    this.ftree = {};
  }

  register(path, type, fn) {
    path = makePath(path);
    const node = makeNode(this.ftree, path);
    node[type] = node[type] || [];
    node[type].push(fn);
  }

  use(path, plugin) {
    if (typeof plugin === 'undefined') {
      plugin = path;
      path = [];
    }
    if (typeof plugin.get === 'function') this.register(path, GET, plugin.get);
    if (typeof plugin.set === 'function') this.register(path, SET, plugin.set);
    if (typeof plugin.on === 'function') this.register(path, ON, plugin.on);
  }

  get(shape) {
    return resolve(shape, GET, this.ftree);
  }

  set(shape) {
    return resolve(shape, SET, this.ftree);
  }

  on(shape) {
    return resolve(shape, ON, this.ftree);
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
  if (ftree[type]) for (const fn of ftree[type]) layers.push(fn(path, qtree));
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
