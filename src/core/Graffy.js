import {
  makePath,
  makeNode,
  getNode,
  wrap,
  prune,
  graft,
  getToken,
  compose,
  resolve,
} from './lib';
import Subscription from './Subscription';

const GET = Symbol();
const PUT = Symbol();

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
  return async ({ query, ...props }, next) => {
    return wrap(
      await fn(
        {
          query: getNode(query, path),
          ...props,
        },
        next,
      ),
      path,
    );
  };
}

const wrapHandler = {
  [GET]: function(handle) {
    return async function({ query, token }, next) {
      const result = await handle({ query, token }, next);
      return prune(result, query);
    };
  },
  [PUT]: function(handle) {
    return handle;
  },
};

export default class Graffy {
  constructor(path, root) {
    if (root) {
      this.root = root;
      this.path = path;
      this.funcs = this.root.funcs;
      this.subs = this.root.subs;
    } else {
      this.funcs = {}; // Registered provider functions, in a tree
      this.subs = {}; // Map of tokens to querys for ongoing subscriptions
      this.subId = 0;
    }
    this.onGet = this.register.bind(this, GET);
    this.onPut = this.register.bind(this, PUT);
  }

  register(type, path, fn) {
    [path, fn] = ensurePath(this.path, path, fn);
    if (this.path) fn = shiftFn(fn, this.path);
    if (wrapHandler[type]) fn = wrapHandler[type](fn);
    const node = makeNode(this.funcs, path);
    node[type] = node[type] || compose();
    node[type].push(fn);
  }

  use(path, provider) {
    [path, provider] = ensurePath(this.path, path, provider);
    provider(
      new Graffy(this.path ? this.path.concat(path) : path, this.root || this),
    );
  }

  get(path, query, options) {
    [path, query, options] = ensurePath(this.path, path, query, options);
    options = options || {};
    query = wrap(query, path);

    if (!options.once) {
      const [token, signal] = getToken();
      const id = this.subId++;
      const sub = new Subscription(query, {
        values: !options.raw,
        resolve: query => resolve(query, this.funcs, GET, token),
        onClose: () => {
          signal();
          delete this.subs[id];
        },
      });
      this.subs[id] = sub;
      return sub.stream;
    } else {
      const result = resolve(query, this.funcs, GET);
      return options.raw
        ? result
        : result.then(tree => getNode(graft(tree, query), path));
    }
  }

  put(/* path, change */) {
    throw Error('core.put.unimplemented');
  }

  // // TODO: Support passing a cache object to sub to share a cache.
  // sub(query, options) {
  //   const [token, signal] = getToken();
  //   const id = this.subId++;
  //   const sub = new Subscription(query, {
  //     values: options && options.values,
  //     resolve: (query, tree) => resolve(query, this.funcs, GET, token, tree),
  //     onClose: () => {
  //       signal();
  //       delete this.subs[id];
  //     },
  //   });
  //   this.subs[id] = sub;
  //   return sub.stream;
  // }

  pub(change) {
    for (const id in this.subs)
      this.subs[id].pub(this.path ? wrap(change, this.path) : change);
  }
}
