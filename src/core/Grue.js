import { makePath, makeNode, getNode, wrap, prune, getToken } from '@grue/common';
import Subscription from './Subscription';
import resolve from './resolve';
import compose from './compose';

export const GET = Symbol();
export const PUT = Symbol();

function ensurePath(path, ...args) {
  if (Array.isArray(path)) {
    return [path, ...args];
  } else if (typeof path === 'string') {
    return [makePath(path), ...args];
  } else {
    return [[], path, ...args];
  }
}

class Backend {
  constructor(path, store) {
    this.path = makePath(path);
    this.store = store;
    this.onGet = this.register.bind(this, GET);
    this.onPut = this.register.bind(this, PUT);
  }

  register(type, path, fn) {
    [path, fn] = ensurePath(path, fn);

    // Let providers work with paths that are relative to their root.
    path = this.path.concat(path);
    const shiftedFn = async ({ shape, ...props }, next) => {
      return wrap(await fn({
        shape: getNode(shape, this.path),
        ...props
      }, next), this.path);
    };

    return this.store.register(type, path, shiftedFn);
  }

  use(path, provider) {
    [path, provider] = ensurePath(path, provider);
    return this.store.use(this.path.concat(path), provider);
  }

  get(path, shape, options) {
    [path, shape, options] = ensurePath(path, shape, options);
    return this.store.get(path, shape, options);
  }
  put() { return this.store.put(); /* Unimplemented. */ }
  sub(path, shape, options) {
    [path, shape, options] = ensurePath(path, shape, options);
    return this.store.sub(path, shape, options);
  }
  pub(change) {
    return this.store.pub(wrap(change, this.path));
  }
}

export default class Grue {
  constructor() {
    this.funcs = {}; // Registered provider functions, in a tree
    this.subs = {};  // Map of tokens to shapes for ongoing subscriptions
    this.subId = 0;
    this.onGet = this.register.bind(this, GET);
    this.onPut = this.register.bind(this, PUT);
  }

  register(type, path, fn) {
    [path, fn] = ensurePath(path, fn);
    const node = makeNode(this.funcs, path);
    node[type] = node[type] || compose();
    node[type].push(fn);
  }

  use(path, provider) {
    [path, provider] = ensurePath(path, provider);
    provider(new Backend(path, this));
  }

  async get(path, shape, options) {
    [path, shape, options = {}] = ensurePath(path, shape, options);
    shape = wrap(shape, path);
    const result = await resolve(shape, this.funcs, GET);
    return prune(result, shape, path, !!options.keepLinks);
  }

  async put(/* path, change */) {
    throw Error('core.put.unimplemented');
  }

  sub(path, shape, options) {
    [path, shape, options] = ensurePath(path, shape, options);
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
    for (const id in this.subs) this.subs[id].pub(change);
  }
}
