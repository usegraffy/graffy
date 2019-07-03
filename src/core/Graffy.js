import { makePath } from '@graffy/common';
import mergeStreams from 'merge-async-iterators';
import { merge, wrap, unwrap, remove } from '@graffy/struct';
// import { decorate } from '@graffy/decorate';

import resolve from './resolve';

function ensurePath(expLength, basePath, path, ...args) {
  if (!basePath) basePath = [];
  // console.log('pathpad', expLength, path, args);
  let argLength = args.length;
  while (argLength && typeof args[argLength - 1] === 'undefined') argLength--;
  if (argLength === expLength) {
    return [
      basePath.concat(Array.isArray(path) ? path : makePath(path)),
      ...args,
    ];
  } else {
    return [basePath, path, ...args];
  }
}

function shiftFn(fn, path) {
  if (!path || !path.length) return fn;
  return async (payload, options, next) => {
    const shiftedNext = async nextPayload =>
      unwrap(await next(wrap(nextPayload, path)), path);
    return wrap(await fn(unwrap(payload, path), options, shiftedNext), path);
  };
}

function shiftGen(fn, path) {
  if (!path || !path.length) return fn;
  return async function*(payload, options, next) {
    const shiftedNext = async function*(nextPayload) {
      for await (const value of await next(wrap(nextPayload, path))) {
        yield unwrap(value, path);
      }
    };
    for await (const value of fn(unwrap(payload, path), options, shiftedNext)) {
      yield wrap(value, path);
    }
  };
}

// function wrapGetHandler(handle) {
//   return async function(query, options, next) {
//     const result = getKnown(await handle(query, options), query);
//     const nextQuery = result ? getUnknown(result, query) : query;
//     if (nextQuery) {
//       const nextValue = await next(nextQuery);
//       merge(result, nextValue);
//     }
//     return getKnown(result, query);
//   };
// }
//
// function wrapSubHandler(handle) {
//   return async function(query, options, next) {
//     let stream = handle(query, options);
//     try {
//       const nextStream = await next(query);
//       // console.log('Merging stream');
//       stream = mergeStreams([stream, nextStream]);
//     } catch (_) {
//       /* TODO: re-throw if not a resolve.unfulfilled */
//     }
//
//     return stream;
//   };
// }
//
// function wrapPutHandler(handle) {
//   return async function(change, options, next) {
//     const result = await handle(change, options);
//     const pendingChange = diff(change, result);
//     if (pendingChange) merge(result, await next(pendingChange));
//     return result;
//   };
// }

function wrapGet(handle, path) {
  return async (query, options, next) => {
    const value = await handle(query, options);

    // TODO: Perhaps cap (initialize with unknown)?

    const nextQuery = remove(query, path);
    if (!nextQuery || !nextQuery.length) return value;
    const nextValue = await next(nextQuery);
    return merge(value, nextValue);
  };
}

function wrapSub(handle, path) {
  return (query, options, next) => {
    const stream = handle(query, options);

    const nextQuery = remove(query, path);
    if (!nextQuery || !nextQuery.length) return stream;
    const nextStream = next(nextQuery);
    return mergeStreams([stream, nextStream]);
  };
}

export default class Graffy {
  constructor(path, root) {
    if (root) {
      this.root = root;
      this.path = path;
      this.handlers = this.root.handlers;
    } else {
      this.handlers = {};
    }
  }

  on(type, path, handle) {
    this.handlers[type] = this.handlers[type] || [];
    this.handlers[type].push({ path, handle });
  }

  onGet(path, handle) {
    [path, handle] = ensurePath(1, this.path, path, handle);
    // handle = wrapGetHandler(handle);
    if (this.path) handle = shiftFn(handle, this.path);
    handle = wrapGet(handle, path);
    this.on('get', path, handle);
  }

  onPut(path, handle) {
    [path, handle] = ensurePath(1, this.path, path, handle);
    // handle = wrapPutHandler(handle);
    if (this.path) handle = shiftFn(handle, this.path);
    this.on('put', path, handle);
  }

  onSub(path, handle) {
    [path, handle] = ensurePath(1, this.path, path, handle);
    // handle = wrapSubHandler(handle);
    if (this.path) handle = shiftGen(handle, this.path);
    handle = wrapSub(handle, path);
    this.on('sub', path, handle);
  }

  use(path, provider) {
    [path, provider] = ensurePath(1, this.path, path, provider);
    provider(
      new Graffy(this.path ? this.path.concat(path) : path, this.root || this),
    );
  }

  get(query, options = {}) {
    const result = Promise.resolve(resolve(this.handlers.get, query, options));
    // result.then(r => console.log(JSON.stringify(r, null, 2)));
    return result;
  }

  async *sub(query, options = {}) {
    // console.log('Sub called with', query, options);
    // console.log('Handlers', this.handlers.sub);

    const stream = resolve(this.handlers.sub, query, options);

    // console.log('Stream is', stream);
    try {
      for await (const value of stream) {
        // console.log(query, 'Yielding', value, options);
        yield value;
      }
    } catch (e) {
      console.log('Graffy: Sub stream error', e);
    }
  }

  async put(change, options = {}) {
    change = await Promise.resolve(resolve(this.handlers.put, change, options));
    for (const id in this.subs) this.subs[id].pub(change);
    return change;
  }
}
