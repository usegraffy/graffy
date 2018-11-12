import { makePath, makeNode, getNode, wrap, prune, getToken } from '../util';
import Subscription from './Subscription';
import resolve from './resolve';
import compose from './compose';

export const GET = Symbol();
export const PUT = Symbol();

class Backend {
  constructor(path, funcs, subs) {
    this.path = makePath(path);
    this.funcs = funcs;
    this.subs = subs;
    this.onGet = this.register.bind(this, GET);
    this.onPut = this.register.bind(this, PUT);
  }

  register(type, path, fn) {
    if (typeof path === 'function') {
      fn = path;
      path = [];
    }
    // Let providers work with paths that are relative to their root.
    path = this.path.concat(makePath(path));
    const shiftedFn = async ({ shape, ...props }, next) => {
      return wrap(await fn({
        shape: getNode(shape, this.path),
        ...props
      }, next), this.path);
    };

    const node = makeNode(this.funcs, path);
    node[type] = node[type] || compose();
    node[type].push(shiftedFn);
  }

  pub(change) {
    for (const token in this.subs) this.subs[token].pub(wrap(change, this.path));
  }

  done(token) {
    this.notifyDone && this.notifyDone(token);
  }
}

export default class Grue {
  constructor() {
    this.funcs = {}; // Registered provider functions, in a tree
    this.subs = {};  // Map of tokens to shapes for ongoing subscriptions
  }

  use(path, provider) {
    if (typeof provider === 'undefined') {
      provider = path;
      path = [];
    }
    provider(new Backend(path, this.funcs, this.subs));
  }

  async get(path, shape, options = {}) {
    if (typeof path === 'object' && !Array.isArray(path)) {
      options = shape || options;
      shape = path;
      path = [];
    }
    shape = wrap(shape, makePath(path));
    const result = await resolve(shape, this.funcs, GET);
    return prune(result, shape, path, !!options.keepLinks);
  }

  async put(/* path, change */) {
    throw Error('put.unimplemented');
  }

  sub(path, shape, { values = false }) {
    shape = wrap(shape, makePath(path));
    const token = getToken();
    const sub = new Subscription(shape, path, {
      values,
      resolve: (shape, tree) => resolve(shape, this.funcs, GET, token, tree),
      onClose: () => { delete this.subs[token]; }
    });
    this.subs[token] = sub;
    return sub.stream;
  }
}
