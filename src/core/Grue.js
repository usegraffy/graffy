import { makePath, makeNode, getNode, wrap, prune, getToken } from '@grue/common';
import Subscription from './Subscription';
import resolve from './resolve';
import compose from './compose';

export const GET = Symbol();
export const PUT = Symbol();

function ensurePath(basePath, path, ...args) {
  if (!basePath) basePath = [];
  if (Array.isArray(path)) {
    return [basePath.concat(path), ...args];
  } else if (typeof path === 'string') {
    return [basePath.concat(makePath(path)), ...args];
  } else {
    return [basePath, path, ...args];
  }
}

function shiftFn(fn, path) {
  return async ({ shape, ...props }, next) => {
    return wrap(await fn({
      shape: getNode(shape, path),
      ...props
    }, next), path);
  };
}

export default class Grue {
  constructor(path, root) {
    if (root) {
      this.root = root;
      this.path = path;
      this.funcs = this.root.funcs;
      this.subs = this.root.subs;
    } else {
      this.funcs = {}; // Registered provider functions, in a tree
      this.subs = {};  // Map of tokens to shapes for ongoing subscriptions
      this.subId = 0;
    }
    this.onGet = this.register.bind(this, GET);
    this.onPut = this.register.bind(this, PUT);
  }

  register(type, path, fn) {
    [path, fn] = ensurePath(this.path, path, fn);
    if (this.path) fn = shiftFn(fn, this.path);
    const node = makeNode(this.funcs, path);
    node[type] = node[type] || compose();
    node[type].push(fn);
  }

  use(path, provider) {
    [path, provider] = ensurePath(this.path, path, provider);
    provider(new Grue(this.path ? this.path.concat(path) : path, this.root || this));
  }

  async get(path, shape) {
    [path, shape] = ensurePath(this.path, path, shape);
    shape = wrap(shape, path);
    const result = await resolve(shape, this.funcs, GET);
    return prune(result, shape, path);
  }

  async getRaw(shape) {
    if (this.path) shape = wrap(shape, this.path);
    const result = await resolve(shape, this.funcs, GET);
    return prune(result, shape);
  }

  async put(/* path, change */) {
    throw Error('core.put.unimplemented');
  }

  sub(path, shape, options) {
    [path, shape, options] = ensurePath(this.path, path, shape, options);
    shape = wrap(shape, path);
    const [token, signal] = getToken();
    const id = this.subId++;
    const sub = new Subscription(shape, path, {
      values: options && options.values,
      resolve: (shape, tree) => resolve(shape, this.funcs, GET, token, tree),
      onClose: () => { signal(); delete this.subs[id]; }
    });
    this.subs[id] = sub;
    return sub.stream;
  }

  pub(change) {
    for (const id in this.subs) this.subs[id].pub(this.path ? wrap(change, this.path) : change);
  }
}
