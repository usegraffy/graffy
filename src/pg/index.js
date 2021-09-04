import { selectUpdatedSince, readSql } from './sql/index.js';
import { filterObject } from './filter/index.js';
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
import { dbRead, dbPoll } from './dbRead.js';
import dbWrite from './dbWrite.js';

// import debug from 'debug';
// const log = debug('graffy:pg:index');
// import { format } from '@graffy/testing';

export default (opts = {}) =>
  (store) => {
    store.on('read', read);
    store.on('write', write);
    store.on('watch', watch);

    // TODO: Make the defaults smarter using introspection.
    const prefix = store.path;
    const pgOptions = {
      prefix,
      table: prefix[prefix.length - 1] || 'default',
      idCol: 'id',
      verCol: 'updatedAt',
      links: {},
      pollInterval: 5000,
      ...opts,
    };

    const watchers = new Set();
    let timestamp = Date.now();

    function getArgKey() {
      /* TODO */
    }

    async function poll() {
      if (!watchers.size) return;
      const result = await dbPoll(timestamp, pgOptions);

      for (const { query, push } of watchers) {
        for (const [object] of result) {
          const payload = [];

          for (const node of query) {
            const args = decodeArgs(node);
            if (isPlainObject(args)) {
              if (filterObject(args, object))
                payload.push({
                  ...object,
                  $ref: object.$key,
                  $key: getArgKey(args, object),
                });
            } else {
              if (object.id === node.key) payload.push(object);
            }
          }

          push(wrap(slice(encodeGraph(payload), query).known, prefix));
        }
      }
    }

    setInterval(poll, pgOptions.pollInterval);

    async function read(query) {
      const res = await dbRead(query, pgOptions, store);
      console.log('Read result', res);
      return res;
    }

    async function write(change) {
      change = unwrap(change, prefix);
      await dbWrite(change, pgOptions);
      return wrap(change, prefix);
    }

    function watch(query) {
      query = unwrap(query, prefix);

      return makeStream((push) => {
        const watcher = { query, push };
        dbRead(query, pgOptions).then((init) => {
          push(wrap(finalize(encodeGraph(init), query), prefix));
          watchers.add(watcher);
        });

        return () => watchers.delete(watcher);
      });
    }
  };
