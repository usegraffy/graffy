import merge from 'lodash.merge';
import { makePath, makeNode, wrap, isRange, getRange } from '../util';

export const MAX_RECURSION = 10;
export const GET = Symbol();
export const PUT = Symbol();
export const SUB = Symbol();

export class Grue {
  constructor() {
    this.ftree = {}; // Provider and Subscriber functions, in a tree
    this.dtree = {}; // Data for serving ongoing subscriptions
    this.subs = {};  // Map of tokens to shapes for ongoing subscriptions
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
    plugin.init(this);
    if (typeof plugin.onGet === 'function') this.register(path, GET, plugin.onGet);
    if (typeof plugin.onPut === 'function') this.register(path, PUT, plugin.onPut);
  }

  get(path, shape) { return resolve(path, shape, GET, this.ftree, { sub: false }); }
  put(path, change) { return resolve(path, change, PUT, this.ftree); }
  sub(path, shape) { return resolve(path, shape, GET, this.ftree, { sub: true }); }
  pub() {}
}

async function resolve(path, shape, type, funcs) {
  const result = {};
  let budget = MAX_RECURSION;
  shape = wrap(shape, makePath(path));
  while (shape) {
    if (--budget < 0) throw new Error('resolve.maxRecursion');
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
    let items = Object.keys(qtree).map(key => getRange(key) || key);
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
  if (typeof rtree === 'string' || Array.isArray(rtree)) {
    merge(shape, wrap(qtree, makePath(rtree)));
    return shape;
  }
  if (typeof rtree !== 'object' || !rtree) {
    // return { rtree, shape };
    throw new Error('resolve.sprout.rleaf');
  }

  for (const key in qtree) {
    if (isRange(key)) { for (const rkey in rtree) {
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
    if (isRange(key)) { for (const rkey in rtree) {
      result[rkey] = prune(rtree[rkey], qtree[key]);
    }} else if (key in rtree) {
      result[key] = prune(rtree[key], qtree[key]);
    }
  }
  return result;
}
