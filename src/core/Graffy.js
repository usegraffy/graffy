import {
  decorate,
  decorateQuery,
  descend,
  makeGraph,
  makePath,
  makeQuery,
  makeFinalGraph,
  unwrap,
  wrap,
} from '@graffy/common';

import { shiftFn, shiftGen } from './shift.js';
import Core from './Core';

function validateArgs(path, ...args) {
  try {
    path = makePath(path);
  } catch {
    args.unshift(path);
    path = [];
  }

  for (const arg of args) {
    if (
      typeof arg !== 'undefined' &&
      typeof arg !== 'object' &&
      typeof arg !== 'function'
    ) {
      throw Error('validateArgs.invalid_argument ' + JSON.stringify(arg));
    }
  }

  return [path, ...args];
}

export default class Graffy {
  constructor(path = [], core = new Core()) {
    this.core = core;
    this.path = path;
  }

  on(type, path, handle) {
    [path, handle] = validateArgs(path, handle);
    path = this.path.concat(path);
    if (path.length) {
      const shift = type === 'sub' ? shiftGen : shiftFn;
      handle = shift(handle, path);
    }
    this.core.on(type, path, handle);
  }

  onGet(path, handle) {
    [path, handle] = validateArgs(path, handle);
    this.on('get', path, async function porcelainGet(query, options) {
      return makeFinalGraph(await handle(decorateQuery(query), options), query);
    });
  }

  onSub(path, handle) {
    [path, handle] = validateArgs(path, handle);
    this.on('sub', path, async function* porcelainSub(query, options) {
      const sub = handle(decorateQuery(query), options);
      let firstValue = (await sub.next()).value;
      yield firstValue && makeFinalGraph(firstValue, query);
      for await (const value of sub) {
        yield value && makeGraph(value, query);
      }
    });
  }

  onPut(path, handle) {
    [path, handle] = validateArgs(path, handle);
    this.on('put', path, async function porcelainPut(change, options) {
      return makeGraph(await handle(decorate(change), options));
    });
  }

  use(path, provider) {
    [path, provider] = validateArgs(path, provider);
    provider(new Graffy(path, this.core));
  }

  call(type, payload, options) {
    payload = wrap(payload, this.path);
    const result = this.core.call(type, payload, options);
    return unwrap(result, this.path);
  }

  async get(path, query, options) {
    [path, query, options] = validateArgs(path, query, options);
    query = wrap(makeQuery(query), path);

    const result = await this.call('get', query, options || {});
    return descend(decorate(result), path);
  }

  async *sub(path, query, options) {
    [path, query, options] = validateArgs(path, query, options);
    query = wrap(makeQuery(query), path);

    const stream = this.call('sub', query, options || {});
    for await (const value of stream) yield descend(decorate(value), path);
  }

  async put(path, change, options) {
    [path, change, options] = validateArgs(path, change, options);
    change = wrap(makeGraph(change), path);

    change = await this.call('put', change, options || {});
    return descend(decorate(change), path);
  }
}
