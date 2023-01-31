import {
  decorate,
  decodeGraph,
  decodeQuery,
  wrapObject,
  unwrapObject,
  encodeGraph,
  encodeQuery,
  finalize,
  wrap,
  unwrap,
  encodePath,
} from '@graffy/common';
import { makeStream, mapStream } from '@graffy/stream';
import { validateCall, validateOn } from './validate.js';
import { shiftFn, shiftGen } from './shift.js';
import Core from './Core.js';

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
    this.core.on(
      'read',
      path,
      shiftFn(async function porcelainRead(query, options, next) {
        // console.log('onRead', path, query);
        const porcelainQuery = decodeQuery(query);
        // console.log('porcelainQuery', path, porcelainQuery);
        let nextCalled = false;
        const encoded = encodeGraph(
          await handle(porcelainQuery, options, async (nextQuery, nextOpts) => {
            nextCalled = true;
            const nextResult = await next(encodeQuery(nextQuery), nextOpts);
            return decodeGraph(nextResult);
          }),
        );

        let final;
        if (!nextCalled) {
          const encodedPath = encodePath(path);
          final = unwrap(
            finalize(wrap(encoded, encodedPath), wrap(query, encodedPath)),
            encodedPath,
          );
        } else {
          final = encoded;
        }
        // console.log({ encoded });
        return final;
      }, path),
    );
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
      }, path),
    );
  }

  onWrite(...args) {
    const [pathArg, handle] = validateOn(...args);
    const path = this.path.concat(pathArg);
    this.core.on(
      'write',
      path,
      shiftFn(async function porcelainWrite(change, options, next) {
        return encodeGraph(
          await handle(
            decodeGraph(change),
            options,
            async (nextChange, nextOpts) => {
              const nextResult = await next(encodeGraph(nextChange), nextOpts);
              return decodeGraph(nextResult);
            },
          ),
        );
      }, path),
    );
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
