import makeOptions from './options.js';
import { encodeGraph, finalize, wrap, unwrap } from '@graffy/common';
import { makeStream } from '@graffy/stream';
import { dbRead, dbWrite } from './transaction';
import pg from './pool.js';

export const connect = (config) => pg.connect(config);
export const setPool = (pool) => pg.setPool(pool);

export default (options = {}) => {
  return (store) => {
    store.on('read', read);
    store.on('write', write);
    store.on('watch', watch);

    const watchers = new Set();

    async function read(query) {
      const pgOptions = await makeOptions(store.path, options);
      return dbRead(query, pgOptions, store);
    }

    async function write(change) {
      const pgOptions = await makeOptions(store.path, options);
      change = unwrap(change, store.path);
      await dbWrite(change, pgOptions);
      return wrap(change, store.path);
    }

    async function watch(query) {
      const pgOptions = await makeOptions(store.path, options);
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
};
