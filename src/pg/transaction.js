import { selectByArgs, selectByIds } from './sql/index.js';
import { linkResult } from './link/index.js';
import pg from './pool.js';
import {
  isPlainObject,
  decodeArgs,
  add,
  isEmpty,
  wrap,
  unwrap,
  finalize,
  merge,
  wrapObject,
  slice,
  encodeGraph,
} from '@graffy/common';
import { format } from '@graffy/testing';
import { put, patch } from './sql/index.js';
import { linkChange } from './link/index.js';
import { isRange, decodeGraph } from '@graffy/common';
import debug from 'debug';

const log = (...text) => debug(`graffy:pg:${text.shift()}`)(text);

export async function dbRead(rootQuery, pgOptions, store) {
  const idQueries = {};
  const refQuery = [];
  const promises = [];
  const results = [];

  async function getByArgs(args, subQuery) {
    const query = selectByArgs(args, pgOptions);
    const result = await pg.select(query);
    add(refQuery, linkResult(result, subQuery, pgOptions));

    const wrappedQuery = wrap(subQuery, [...pgOptions.prefix, args]);
    const wrappedGraph = encodeGraph(wrapObject(result, pgOptions.prefix));

    log(
      'read',
      'getByArgs',
      format(wrappedGraph),
      format(wrappedQuery),
      format(finalize(wrappedGraph, wrappedQuery)),
    );

    merge(results, finalize(wrappedGraph, wrappedQuery));
  }

  async function getByIds() {
    const query = selectByIds(Object.keys(idQueries), pgOptions);
    const result = await pg.select(query);
    result.forEach((object) => {
      const id = object[pgOptions.idProp];
      const subQuery = idQueries[id];
      add(refQuery, linkResult([object], subQuery, pgOptions));

      const wrappedQuery = wrap(subQuery, [...pgOptions.prefix, id]);
      const wrappedGraph = encodeGraph(wrapObject(object, pgOptions.prefix));

      log(
        'read',
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

  if (refQuery.length) {
    log('read', 'refQuery', format(refQuery));
    merge(results, await store.call('read', refQuery));
  }
  // console.log(results);
  log('read', 'dbRead', format(rootQuery), format(results));
  return slice(results, rootQuery).known || [];
}

export const dbWrite = async (change, pgOptions) => {
  const sqls = [];

  for (const node of change) {
    if (isRange(node)) {
      throw Error(
        node.key === node.end
          ? 'pg_write.delete_unsupported'
          : 'pg_write.write_range_unsupported',
      );
    }

    const object = linkChange(decodeGraph(node.children), pgOptions);
    const arg = decodeArgs(node);

    if (object.$put) {
      if (object.$put !== true) throw Error('pg_write.partial_put_unsupported');
      sqls.push(put(object, arg, pgOptions));
    } else {
      sqls.push(patch(object, arg, pgOptions));
    }
  }

  await Promise.all(sqls.map((sql) => pg.insert(sql)));

  log('write', change);
  return change;
};
