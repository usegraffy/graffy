import { selectByArgs, selectByIds, selectUpdatedSince } from './sql/index.js';
import { linkResult } from './link/index.js';
import pool from './pool.js';
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
import debug from 'debug';
const log = debug('graffy:pg:dbRead');

export async function dbRead(rootQuery, options, store) {
  const idQueries = {};
  const refQuery = [];
  const promises = [];
  const results = [];

  const { idCol, prefix } = options;

  async function getByArgs(args, subQuery) {
    const result = await readSql(selectByArgs(args, options), pool);
    add(refQuery, linkResult(result, subQuery, options));

    const wrappedQuery = wrap(subQuery, [...prefix, args]);
    const wrappedGraph = encodeGraph(wrapObject(result, prefix));

    log(
      'getByArgs',
      format(wrappedGraph),
      format(wrappedQuery),
      format(finalize(wrappedGraph, wrappedQuery)),
    );

    merge(results, finalize(wrappedGraph, wrappedQuery));
  }

  async function getByIds() {
    const result = await readSql(
      selectByIds(Object.keys(idQueries), options),
      pool,
    );

    result.forEach((object) => {
      const id = object[idCol];
      const subQuery = idQueries[id];
      add(refQuery, linkResult([object], subQuery, options));

      const wrappedQuery = wrap(subQuery, [...prefix, id]);
      const wrappedGraph = encodeGraph(wrapObject(object, prefix));

      log(
        'getByIds',
        format(wrappedGraph),
        format(wrappedQuery),
        format(finalize(wrappedGraph, wrappedQuery)),
      );

      merge(results, finalize(wrappedGraph, wrappedQuery));
    });
  }

  const query = unwrap(rootQuery, prefix);

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
    log('refQuery', format(refQuery));
    merge(results, await store.call('read', refQuery));
  }

  log('dbRead', format(rootQuery), format(results));
  return slice(results, rootQuery).known || [];
}

export async function dbPoll(timestamp, options) {
  return readSql(selectUpdatedSince(timestamp, options), pool);
}

async function readSql(sqlQuery, client) {
  log(sqlQuery.text);
  log(sqlQuery.values);

  sqlQuery.rowMode = 'array';
  const result = (await client.query(sqlQuery)).rows.flat();
  // Each row is an array, as there is only one column returned.
  log('ReadSQL', result);
  return result;
}
