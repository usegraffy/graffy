import {
  isPlainObject,
  decodeArgs,
  wrap,
  unwrap,
  finalize,
  merge,
  wrapObject,
  slice,
  encodeGraph,
  isEmpty,
  isRange,
  decodeGraph,
} from '@graffy/common';
import { selectByArgs, selectByIds } from './sql/select';
import { put, patch } from './sql/index.js';
import { linkChange } from './link/index.js';
import pg from './pool.js';
import { format } from '@graffy/testing';
import debug from 'debug';
const log = debug('graffy:pg:dbRead');

export const dbRead = async (rootQuery, opts, store) => {
  const idQueries = {};
  const promises = [];
  const results = [];
  const { id } = opts;
  async function getByArgs(args, subQuery) {
    let result = await pg.select(selectByArgs(args, opts));
    result = result.map(([object]) => [{ ...object, keys: object[id] }]);

    const wrappedQuery = wrap(subQuery, [...store.path, args]);
    const wrappedGraph = encodeGraph(wrapObject(result, store.path));

    log(
      'getByArgs',
      format(wrappedGraph),
      format(wrappedQuery),
      format(finalize(wrappedGraph, wrappedQuery)),
    );

    merge(results, finalize(wrappedGraph, wrappedQuery));
  }

  async function getByIds() {
    const query = selectByIds(Object.keys(idQueries), opts);
    const result = await pg.select(query);
    result.forEach((object) => {
      object.$key = object[id];
      const idQuery = object[id];
      const subQuery = idQueries[idQuery];
      const wrappedQuery = wrap(subQuery, [...store.path, idQuery]);
      const wrappedGraph = encodeGraph(wrapObject(object, store.path));
      log(
        'getByIds',
        format(wrappedGraph),
        format(wrappedQuery),
        format(finalize(wrappedGraph, wrappedQuery)),
      );

      merge(results, finalize(wrappedGraph, wrappedQuery));
    });
  }

  const query = unwrap(rootQuery, store.path);
  for (const node of query) {
    const args = decodeArgs(node);
    if (isPlainObject(args)) {
      promises.push(getByArgs(args, node.children));
    } else {
      idQueries[node.key] = node.children;
    }
  }

  if (!isEmpty(idQueries)) promises.push(getByIds());
  await Promise.all(promises);

  log('dbRead', format(rootQuery), format(results));
  return slice(results, rootQuery).known || [];
};

export const dbWrite = async (change, opts) => {
  const queries = [];

  const addToPuts = (sql) => queries.push(pg.insert(sql));
  const addToPatches = (sql) => queries.push(pg.update(sql));

  for (const node of change) {
    if (isRange(node)) {
      throw Error(
        node.key === node.end
          ? 'pg_write.delete_unsupported'
          : 'pg_write.write_range_unsupported',
      );
    }

    const arg = decodeArgs(node);
    const object = linkChange(decodeGraph(node.children), opts);
    if (object.$put && object.$put !== true)
      throw Error('pg_write.partial_put_unsupported');

    object.$put || false
      ? addToPuts(put(object, arg, opts))
      : addToPatches(patch(object, arg, opts));
  }

  await Promise.all(queries);

  log(change);
  return change;
};
