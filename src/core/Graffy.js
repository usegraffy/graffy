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
      const shift = type === 'watch' ? shiftGen : shiftFn;
      handle = shift(handle, path);
    }
    this.core.on(type, path, handle);
  }

  onRead(path, handle) {
    [path, handle] = validateArgs(path, handle);
    this.on('read', path, async function porcelainRead(query, options) {
      return makeFinalGraph(await handle(decorateQuery(query), options), query);
    });
  }

  onWatch(path, handle) {
    [path, handle] = validateArgs(path, handle);
    this.on('watch', path, async function* porcelainWatch(query, options) {
      const subscription = handle(decorateQuery(query), options);
      let firstValue = (await subscription.next()).value;
      yield firstValue && makeFinalGraph(firstValue, query);
      for await (const value of subscription) {
        yield value && makeGraph(value, query);
      }
    });
  }

  onWrite(path, handle) {
    [path, handle] = validateArgs(path, handle);
    this.on('write', path, async function porcelainWrite(change, options) {
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

  async read(path, query, options) {
    [path, query, options] = validateArgs(path, query, options);
    query = wrap(makeQuery(query), path);

    const result = await this.call('read', query, options || {});
    return descend(decorate(result), path);
  }

  async *watch(path, query, options) {
    [path, query, options] = validateArgs(path, query, options);
    query = wrap(makeQuery(query), path);

    const stream = this.call('watch', query, options || {});
    for await (const value of stream) yield descend(decorate(value), path);
  }

  async write(path, change, options) {
    [path, change, options] = validateArgs(path, change, options);
    change = wrap(makeGraph(change), path);

    change = await this.call('write', change, options || {});
    return descend(decorate(change), path);
  }
}
