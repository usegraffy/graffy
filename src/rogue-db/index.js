import {
  selectByArgs,
  selectByIds,
  upsertToId,
  selectUpdatedSince,
} from './sql';
import { linkResult } from './link';
import { filterObject } from './filter';
import {
  isArgObject,
  decodeArgs,
  makeGraph,
  decorate,
  finalize,
  slice,
} from '@graffy/common';
import { makeStream } from '@graffy/stream';

import { format } from '@graffy/testing';

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

  async function dbRead(query, options) {
    const ops = [];
    const ids = [];
    const idSubQueries = [];

    for (const node of query) {
      const args = decodeArgs(node);
      if (isArgObject(args)) {
        ops.push(
          selectByArgs(args, options).then((res) =>
            linkResult(res, node.children, links),
          ),
        );
      } else {
        ids.push(node.key);
        idSubQueries.push(node.children);
      }
    }

    if (ids.length) {
      ops.push(
        selectByIds(ids, options).then((res) =>
          res.map(
            (object, i) => linkResult([object], idSubQueries[i], links)[0],
          ),
        ),
      );
    }

    return (await Promise.all(ops)).flat(1);
  }

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

        push(slice(makeGraph(payload), query).known);
      }
    }
  }

  setInterval(poll, pollInterval);

  async function read(query) {
    const res = await dbRead(query, options);
    return finalize(makeGraph(res), query);
  }

  async function write(change) {
    const ops = [];

    for (const node of change) {
      const args = decodeArgs(node);
      if (isArgObject(args)) {
        throw Error('pg_write.write_arg_unimplemented');
      } else {
        ops.push(
          upsertToId({ id: [node.key], ...decorate(node.children) }, options),
        );
      }
    }

    await Promise.all(ops);
    return change;
  }

  function watch(query) {
    return makeStream((push) => {
      const watcher = { query, push };
      dbRead(query, options).then(
        (init) => push(finalize(makeGraph(init), query)),
        watchers.add(watcher),
      );

      return () => watchers.delete(watcher);
    });
  }
};
