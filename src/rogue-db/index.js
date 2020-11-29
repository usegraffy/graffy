import { selectUpdatedSince } from './sql';
import { filterObject } from './filter';
import {
  isArgObject,
  decodeArgs,
  encodeGraph,
  finalize,
  slice,
} from '@graffy/common';
import { makeStream } from '@graffy/stream';
import { dbRead, dbWrite } from './dbOps';

// import { format } from '@graffy/testing';

export default ({
  collection,
  indexes = [],
  links = [],
  pollInterval = 1000,
} = {}) => (store) => {
  store.on('read', read);
  store.on('write', write);
  store.on('watch', watch);

  const options = {
    prefix: store.path,
    collection: collection || store.path[store.path.length - 1] || 'default',
    indexes,
    links,
  };

  const watchers = new Set();
  let timestamp = Date.now();

  async function poll() {
    if (!watchers.size) return;
    const res = await selectUpdatedSince(timestamp, options);

    for (const object of res) {
      for (const { query, push } of watchers) {
        const payload = [];

        for (const node of query) {
          const args = decodeArgs(node);
          if (isArgObject(args)) {
            if (filterObject(args, object)) payload.push(object);
          } else {
            if (object.id._val_.includes(node.key)) payload.push(object);
          }
        }

        push(slice(encodeGraph(payload), query).known);
      }
    }
  }

  setInterval(poll, pollInterval);

  async function read(query) {
    const res = await dbRead(query, options);
    return finalize(encodeGraph(res), query);
  }

  async function write(change) {
    await dbWrite(change, options);
    return change;
  }

  function watch(query) {
    return makeStream((push) => {
      const watcher = { query, push };
      dbRead(query, options).then((init) => {
        push(finalize(encodeGraph(init), query));
        watchers.add(watcher);
      });

      return () => watchers.delete(watcher);
    });
  }
};
