import {
  decodeGraph,
  decodeQuery,
  decorate,
  encodeGraph,
  encodePath,
  encodeQuery,
  finalize,
  unwrap,
  unwrapObject,
  wrap,
  wrapObject,
} from '@graffy/common';
import { makeStream, mapStream } from '@graffy/stream';
import Core from './Core.js';
import { shiftGen, unchanged, wrapProvider } from './shift.js';
import { validateCall, validateOn } from './validate.js';

export { unchanged } from './shift.js';

/**
 * @template S
 */
export default class Graffy {
  constructor(path = [], core = new Core()) {
    this.core = core;
    this.path = path;
  }

  on(type, ...args) {
    const [pathArg, handler] = validateOn(...args);
    const path = this.path.concat(pathArg);
    this.core.on(type, path, handler);
  }

  onRead(...args) {
    const [pathArg, handle] = validateOn(...args);
    const path = this.path.concat(pathArg);
    this.core.on('read', path, wrapProvider(handle, path, true));
  }

  onWatch(...args) {
    const [pathArg, handle] = validateOn(...args);
    const path = this.path.concat(pathArg);
    this.core.on(
      'watch',
      path,
      shiftGen(function porcelainWatch(query, options) {
        return makeStream((push, end) => {
          const subscription = handle(decodeQuery(query), options, () => {
            // TODO: Implement this using mergeStreams
            throw Error(`porcelain.watch_next_unsupported: ${path}`);
          });
          (async () => {
            try {
              const firstValue = (await subscription.next()).value;
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
      }, path),
    );
  }

  onWrite(...args) {
    const [pathArg, handle] = validateOn(...args);
    const path = this.path.concat(pathArg);
    this.core.on('write', path, wrapProvider(handle, path, false));
  }

  use(...args) {
    const [pathArg, provider] = validateOn(...args);
    const path = this.path.concat(pathArg);
    provider(new Graffy(path, this.core));
  }

  call(type, payload, options = {}) {
    return this.core.call(type, payload, options);
  }

  async read(...args) {
    const [path, porcelainQuery, options] = validateCall(...args);
    const rootQuery = wrapObject(porcelainQuery, path);
    const query = encodeQuery(rootQuery);
    const result = await this.core.call('read', query, options || {});
    return unwrapObject(decorate(result, rootQuery), path);
  }

  watch(...args) {
    const [path, porcelainQuery, options] = validateCall(...args);
    const rootQuery = wrapObject(porcelainQuery, path);
    const query = encodeQuery(rootQuery);
    const stream = this.core.call('watch', query, options || {});
    return mapStream(stream, (value) =>
      unwrapObject(decorate(value, rootQuery), path),
    );
  }

  async write(...args) {
    const [path, porcelainChange, options] = validateCall(...args);
    const change = encodeGraph(wrapObject(porcelainChange, path));
    const writtenChange = await this.core.call('write', change, options || {});
    return unwrapObject(decodeGraph(writtenChange), path);
  }
}

Graffy.unchanged = unchanged;
