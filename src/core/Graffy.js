import {
  makeGraph,
  makeQuery,
  makeFinalGraph,
  wrap,
  unwrap,
  descend,
  makePath,
  decorate,
} from '@graffy/common';

import { shiftFn, shiftGen } from './shift.js';
import Core from './Core';

function ensurePath(path, ...args) {
  try {
    path = makePath(path);
    return [path, ...args];
  } catch (_) {
    return [[], path, ...args];
  }
}

export default class Graffy {
  constructor(path = [], core = new Core()) {
    this.core = core;
    this.path = path;
  }

  on(type, path, handle) {
    [path, handle] = ensurePath(path, handle);
    path = this.path.concat(path);
    if (path.length) {
      const shift = type === 'sub' ? shiftGen : shiftFn;
      handle = shift(handle, path);
    }
    this.core.on(type, path, handle);
  }

  onGet(path, handle) {
    [path, handle] = ensurePath(path, handle);
    this.on('get', path, async function porcelainGet(query, options) {
      return makeFinalGraph(await handle(query, options), query);
    });
  }

  onSub(path, handle) {
    [path, handle] = ensurePath(path, handle);
    this.on('sub', path, async function* porcelainSub(query, options) {
      for await (const value of handle(query, options)) {
        yield makeFinalGraph(value, query);
      }
    });
  }

  onPut(path, handle) {
    [path, handle] = ensurePath(path, handle);
    this.on('put', path, async function porcelainPut(change, options) {
      return makeGraph(await handle(change, options));
    });
  }

  use(path, provider) {
    [path, provider] = ensurePath(path, provider);
    provider(new Graffy(path, this.core));
  }

  call(type, payload, options) {
    payload = wrap(payload, this.path);
    const result = this.core.call(type, payload, options);
    return unwrap(result, this.path);
  }

  async get(path, query, options) {
    [path, query, options] = ensurePath(path, query, options);
    query = wrap(makeQuery(query), path);

    const result = await this.call('get', query, options || {});
    return descend(decorate(result), path);
  }

  async *sub(path, query, options) {
    [path, query, options] = ensurePath(path, query, options);
    query = wrap(makeQuery(query), path);

    const stream = this.call('sub', query, options || {});
    for await (const value of stream) yield descend(decorate(value), path);
  }

  async put(path, change, options) {
    [path, change, options] = ensurePath(path, change, options);
    change = wrap(makeGraph(change), path);

    change = await this.call('put', change, options || {});
    return descend(decorate(change), path);
  }
}
