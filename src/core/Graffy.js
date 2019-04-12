import {
  makePath,
  unwrap,
  wrap,
  getKnown,
  getUnknown,
  diff,
  graft,
  merge,
} from '@graffy/common';

import resolve from './resolve';

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
  if (!path || !path.length) return fn;
  return async (payload, options, next) => {
    return wrap(
      await fn(unwrap(payload, path), options, nextPayload =>
        next(wrap(nextPayload, path)),
      ),
      path,
    );
  };
}

function wrapGetHandler(handle) {
  return async function(query, options, next) {
    const result = getKnown(await handle(query, options), query);
    const nextQuery = result ? getUnknown(result, query) : query;
    if (nextQuery) merge(result, await next(nextQuery));
    return getKnown(result, query);
  };
}

function wrapPutHandler(handle) {
  return async function(change, options, next) {
    const result = await handle(change, options);
    const pendingChange = diff(change, result);
    if (pendingChange) merge(result, await next(pendingChange));
    return result;
  };
}

export default class Graffy {
  constructor(path, root) {
    if (root) {
      this.root = root;
      this.path = path;
      this.getHandlers = this.root.getHandlers;
      this.putHandlers = this.root.putHandlers;
      this.subHandlers = this.root.subHandlers;
    } else {
      this.getHandlers = [];
      this.putHandlers = [];
      this.subHandlers = [];
    }
  }

  onGet(path, handle) {
    [path, handle] = ensurePath(this.path, path, handle);
    handle = wrapGetHandler(handle);
    if (this.path) handle = shiftFn(handle, this.path);
    this.getHandlers.push({ path, handle });
  }

  onPut(path, handle) {
    [path, handle] = ensurePath(this.path, path, handle);
    handle = wrapPutHandler(handle);
    if (this.path) handle = shiftFn(handle, this.path);
    this.putHandlers.push({ path, handle });
  }

  onSub(path, handle) {
    [path, handle] = ensurePath(this.path, path, handle);
    if (this.path) handle = shiftFn(handle, this.path);
    this.subHandlers.push({ path, handle });
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

    const result = resolve(this.getHandlers, query, options);
    return options.raw
      ? result
      : result.then(tree => unwrap(graft(tree, query), path));
  }

  async *sub(path, query, options) {
    [path, query, options] = ensurePath(this.path, path, query, options);
    options = options || {};
    query = wrap(query, path);

    const stream = await resolve(this.subHandlers, query, options);

    // console.log('Stream is', await stream);

    for await (const value of stream) {
      yield options.raw ? value : unwrap(graft(value, query), path);
    }
  }

  async put(path, change, options) {
    [path, change, options] = ensurePath(this.path, path, change, options);
    options = options || {};
    change = wrap(change, path);
    change = await resolve(this.putHandlers, change, options);
    for (const id in this.subs) this.subs[id].pub(change);
    return change;
  }

  pub(change) {
    for (const id in this.subs)
      this.subs[id].pub(this.path ? wrap(change, this.path) : change);
  }
}
