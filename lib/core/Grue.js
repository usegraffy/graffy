import { makePath, makeNode, wrap, prune, getToken } from '../util';
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
  }

  register(path, type, fn) {
    // Let providers work with paths that are relative to their root.
    path = this.path.concat(makePath(path));
    const shiftedFn = (path, shape, opts) =>
      wrap(fn(path.slice(this.path.length), shape, opts), this.path);

    const node = makeNode(this.funcs, path);
    node[type] = node[type] || compose();
    node[type].push(shiftedFn);
  }

  onGet(path, fn) { this.register(path, GET, fn); }
  onPut(path, fn) { this.register(path, PUT, fn); }

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
    provider.init(new Backend(path, this.funcs, this.subs));
  }

  async get(path, shape) {
    shape = wrap(shape, makePath(path));
    const result = await resolve(shape, this.funcs, GET);
    return prune(result, shape, path);
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
