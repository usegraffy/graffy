import {
  decorate,
  decorateQuery,
  descend,
  makeGraph,
  makePath,
  makeQuery,
  finalize,
  unwrap,
  wrap,
} from '@graffy/common';
import makeStream from '@graffy/stream';
import { shiftFn, shiftGen } from './shift.js';
import Core from './Core';

function validateArgs(first, ...args) {
  let path;
  try {
    path = makePath(first);
  } catch {
    args.unshift(first);
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

  on(type, ...args) {
    const [rawPath, rawHandler] = validateArgs(...args);
    const path = this.path.concat(rawPath);
    const handler = path.length
      ? (type === 'watch' ? shiftGen : shiftFn)(rawHandler, path)
      : rawHandler;

    this.core.on(type, path, handler);
  }

  onRead(...args) {
    const [path, handle] = validateArgs(...args);
    this.on('read', path, async function porcelainRead(query, options) {
      return finalize(
        makeGraph(await handle(decorateQuery(query), options)),
        query,
      );
    });
  }

  onWatch(...args) {
    const [path, handle] = validateArgs(...args);
    this.on('watch', path, function porcelainWatch(query, options) {
      return makeStream(push => {
        const subscription = handle(decorateQuery(query), options);
        (async function() {
          let firstValue = (await subscription.next()).value;
          push(firstValue && finalize(makeGraph(firstValue), query));
          for await (const value of subscription) {
            push(value && makeGraph(value));
          }
        })();
        return () => subscription.return();
      });
    });
  }

  onWrite(...args) {
    const [path, handle] = validateArgs(...args);
    this.on('write', path, async function porcelainWrite(change, options) {
      return makeGraph(await handle(decorate(change), options));
    });
  }

  use(...args) {
    const [path, provider] = validateArgs(...args);
    provider(new Graffy(path, this.core));
  }

  call(type, unwrappedPayload, options) {
    const payload = wrap(unwrappedPayload, this.path);
    const result = this.core.call(type, payload, options);
    return unwrap(result, this.path);
  }

  async read(...args) {
    const [path, porcelainQuery, options] = validateArgs(...args);
    const query = wrap(makeQuery(porcelainQuery), path);
    const result = await this.call('read', query, options || {});
    return descend(decorate(result), path);
  }

  async *watch(...args) {
    const [path, porcelainQuery, options] = validateArgs(...args);
    const query = wrap(makeQuery(porcelainQuery), path);
    const stream = this.call('watch', query, options || {});
    for await (const value of stream) yield descend(decorate(value), path);
  }

  async write(...args) {
    const [path, porcelainChange, options] = validateArgs(...args);
    const change = wrap(makeGraph(porcelainChange), path);
    const writtenChange = await this.call('write', change, options || {});
    return descend(decorate(writtenChange), path);
  }
}
