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

  on(type, path, handler) {
    this.core.on(type, path, handler);
  }

  onRead(...args) {
    const [pathArg, handle] = validateOn(...args);
    const path = this.path.concat(pathArg);
    this.on(
      'read',
      path,
      shiftFn(async function porcelainRead(query, options) {
        // console.log('onRead', path, query);
        const decoded = decodeQuery(query);
        // console.log('decoded', path, decoded);
        const encoded = encodeGraph(await handle(decoded, options));
        // console.log({ encoded });
        const finalized = finalize(encoded, query);
        // console.log({ finalized });
        return finalized;
      }, path),
    );
  }

  onWatch(...args) {
    const [pathArg, handle] = validateOn(...args);
    const path = this.path.concat(pathArg);
    this.on(
      'watch',
      path,
      shiftGen(function porcelainWatch(query, options) {
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
      }, path),
    );
  }

  onWrite(...args) {
    const [pathArg, handle] = validateOn(...args);
    const path = this.path.concat(pathArg);
    this.on(
      'write',
      path,
      shiftFn(async function porcelainWrite(change, options) {
        return encodeGraph(await handle(decodeGraph(change), options));
      }, path),
    );
  }

  use(...args) {
    const [path, provider] = validateOn(...args);
    provider(new Graffy(path, this.core));
  }

  call(type, payload, options = {}) {
    return this.core.call(type, payload, options);
  }

  async read(...args) {
    const [path, porcelainQuery, options] = validateCall(...args);
    const rootQuery = wrapObject(porcelainQuery, path);
    const query = encodeQuery(rootQuery);
    const result = await this.call('read', query, options || {});
    return unwrapObject(decorate(result, rootQuery), path);
  }

  watch(...args) {
    const [path, porcelainQuery, options] = validateCall(...args);
    const rootQuery = wrapObject(porcelainQuery, path);
    const query = encodeQuery(rootQuery);
    const stream = this.call('watch', query, options || {});
    return mapStream(stream, (value) =>
      unwrapObject(decorate(value, rootQuery), path),
    );
  }

  async write(...args) {
    const [path, porcelainChange, options] = validateCall(...args);
    const change = wrap(encodeGraph(porcelainChange), path);
    const writtenChange = await this.call('write', change, options || {});
    return unwrapObject(decodeGraph(writtenChange), path);
  }
}
