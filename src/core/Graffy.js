import {
  decodeGraph,
  decodeQuery,
  wrapObject,
  unwrapObject,
  encodeGraph,
  makePath,
  encodeQuery,
  finalize,
  unwrap,
  wrap,
} from '@graffy/common';
import { makeStream, mapStream } from '@graffy/stream';
import { shiftFn, shiftGen } from './shift.js';
import Core from './Core';
import debug from 'debug';
import { format } from '@graffy/testing';

const log = debug('graffy:porcelain');

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
        encodeGraph(await handle(decodeQuery(query), options)),
        query,
      );
    });
  }

  onWatch(...args) {
    const [path, handle] = validateArgs(...args);
    this.on('watch', path, function porcelainWatch(query, options) {
      return makeStream((push, end) => {
        const subscription = handle(decodeQuery(query), options);
        (async function () {
          try {
            let firstValue = (await subscription.next()).value;
            push(firstValue && finalize(encodeGraph(firstValue), query));
            for await (const value of subscription) {
              push(value && encodeGraph(value));
            }
          } catch (e) {
            end(e);
          }
        })();
        return () => subscription.return();
      });
    });
  }

  onWrite(...args) {
    const [path, handle] = validateArgs(...args);
    this.on('write', path, async function porcelainWrite(change, options) {
      return encodeGraph(await handle(decodeGraph(change), options));
    });
  }

  use(...args) {
    const [path, provider] = validateArgs(...args);
    provider(new Graffy(path, this.core));
  }

  call(type, payload, options = {}) {
    return this.core.call(type, payload, options);
  }

  async read(...args) {
    const [pathArg, porcelainQuery, options] = validateArgs(...args);
    const path = this.path.concat(pathArg);
    const rootQuery = wrapObject(porcelainQuery, path);
    const query = encodeQuery(rootQuery);
    const result = await this.call('read', query, options || {});
    return unwrapObject(decodeGraph(result, rootQuery), path);
  }

  watch(...args) {
    const [pathArg, porcelainQuery, options] = validateArgs(...args);
    const path = this.path.concat(pathArg);
    const rootQuery = wrapObject(porcelainQuery, path);
    const query = encodeQuery(rootQuery);
    const stream = this.call('watch', query, options || {});
    return mapStream(stream, (value) =>
      unwrapObject(decodeGraph(value, rootQuery), path),
    );
  }

  async write(...args) {
    const [pathArg, porcelainChange, options] = validateArgs(...args);
    const path = this.path.concat(pathArg);
    const change = wrap(encodeGraph(porcelainChange), path);
    const writtenChange = await this.call('write', change, options || {});
    return unwrapObject(decodeGraph(writtenChange), path);
  }
}
