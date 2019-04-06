import {
  makePath,
  makeNode,
  unwrap,
  wrap,
  prune,
  sprout,
  diff,
  graft,
  cap,
  compose,
  resolve,
  merge,
} from '@graffy/common';

const GET = Symbol();
const PUT = Symbol();
const SUB = Symbol();

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
  return async (payload, options, next) => {
    return wrap(await fn(unwrap(payload, path), options, next), path);
  };
}

const wrapHandler = {
  [GET]: function(handle) {
    return async function(query, options, next) {
      const result = prune(await handle(query, options), query);
      const nextQuery = sprout(result, query);
      if (nextQuery) merge(result, await next(nextQuery));
      return prune(result, query);
    };
  },
  [PUT]: function(handle) {
    return async function(change, options, next) {
      const result = await handle(change, options);
      const pendingChange = diff(change, result);
      if (pendingChange) merge(result, await next(pendingChange));
      return result;
    };
  },
  [SUB]: function(handle) {
    return async function*(query, options, next) {};
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
      this.subs = {}; // Map of tokens to queries for ongoing subscriptions
      this.subId = 0;
    }
    this.onGet = this.register.bind(this, GET);
    this.onSub = this.register.bind(this, SUB);
    this.onPut = this.register.bind(this, PUT);
  }

  register(type, path, fn) {
    [path, fn] = ensurePath(this.path, path, fn);
    if (wrapHandler[type]) fn = wrapHandler[type](fn);
    if (this.path) fn = shiftFn(fn, this.path);
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

    const result = resolve(this.funcs, GET, query, options).then(result =>
      cap(result, query),
    );
    return options.raw
      ? result
      : result.then(tree => unwrap(graft(tree, query), path));
  }

  sub = async function*(path, query, options) {
    [path, query, options] = ensurePath(this.path, path, query, options);
    options = options || {};
    query = wrap(query, path);

    const stream = resolve(this.funcs, SUB, query, options);
    for await (const value of stream) {
      yield* options.raw ? value : unwrap(graft(value, query), path);
    }
  };

  async put(path, change, options) {
    [path, change, options] = ensurePath(this.path, path, change, options);
    options = options || {};
    change = wrap(change, path);
    change = await resolve(this.funcs, PUT, change, options);
    for (const id in this.subs) this.subs[id].pub(change);
    return change;
  }

  pub(change) {
    for (const id in this.subs)
      this.subs[id].pub(this.path ? wrap(change, this.path) : change);
  }
}
