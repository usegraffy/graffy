import { selectUpdatedSince, readSql } from './sql/index.js';
import { filterObject } from './filter/index.js';
import makeOptions from './options.js';
import {
  isPlainObject,
  decodeArgs,
  encodeGraph,
  finalize,
  slice,
  wrap,
  unwrap,
} from '@graffy/common';
import { makeStream } from '@graffy/stream';
import dbRead from './dbRead.js';
import dbWrite from './dbWrite.js';
import pool from './pool.js';

// import debug from 'debug';
// const log = debug('graffy:pg:index');
// import { format } from '@graffy/testing';

export default (opts = {}) => (store) => {
  store.on('read', read);
  store.on('write', write);
  store.on('watch', watch);

  const pgOptions = makeOptions(store.path, opts);

  const watchers = new Set();
  let timestamp = Date.now();

  async function poll() {
    if (!watchers.size) return;
    const res = await readSql(selectUpdatedSince(timestamp, pgOptions), pool);

    for (const [object] of res) {
      for (const { query, push } of watchers) {
        const payload = [];

        for (const node of query) {
          const args = decodeArgs(node);
          if (isPlainObject(args)) {
            if (filterObject(args, object)) payload.push(object);
          } else {
            if (object.id === node.key) payload.push(object);
          }
        }

        push(wrap(slice(encodeGraph(payload), query).known, store.path));
      }
    }
  }

  setInterval(poll, pgOptions.pollInterval);

  function read(query) {
    return dbRead(query, pgOptions, store);
    // log(format(rootQuery));
    // const query = unwrap(rootQuery, store.path);
    // const result = await dbRead(query, pgOptions);
    // const rootResult = slice(
    //   finalize(encodeGraph(wrapObject(result, store.path)), rootQuery),
    //   rootQuery,
    // ).known;
    // log(format(rootResult));
    // return rootResult;
  }

  async function write(change) {
    change = unwrap(change, store.path);
    await dbWrite(change, pgOptions);
    return wrap(change, store.path);
  }

  function watch(query) {
    query = unwrap(query, store.path);

    return makeStream((push) => {
      const watcher = { query, push };
      dbRead(query, pgOptions).then((init) => {
        push(wrap(finalize(encodeGraph(init), query), store.path));
        watchers.add(watcher);
      });

      return () => watchers.delete(watcher);
    });
  }
};
