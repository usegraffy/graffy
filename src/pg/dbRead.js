import { selectByArgs, selectByIds } from './sql';
import { linkResult } from './link';
import pool from './pool';
import {
  isArgObject,
  decodeArgs,
  add,
  isEmpty,
  wrap,
  unwrap,
  finalize,
  merge,
  slice,
  encodeGraph,
} from '@graffy/common';
import debug from 'debug';
const log = debug('graffy:pg:dbRead');

export default async function dbRead(rootQuery, pgOptions, store) {
  const idQueries = {};
  const refQuery = [];
  const promises = [];
  const results = [];

  async function getByArgs(args, subQuery) {
    const result = await readSql(selectByArgs(args, pgOptions), pool);
    add(refQuery, linkResult(result, subQuery, pgOptions));

    merge(
      results,
      wrap(finalize(encodeGraph(result), subQuery), pgOptions.prefix),
    );
  }

  async function getByIds() {
    const result = await readSql(
      selectByIds(Object.keys(idQueries), pgOptions),
      pool,
    );

    result.forEach((object) => {
      const subQuery = idQueries[object[pgOptions.idProp]];
      add(refQuery, linkResult([object], subQuery, pgOptions));
      merge(
        results,
        wrap(finalize(encodeGraph([object]), subQuery), pgOptions.prefix),
      );
    });
  }

  const query = unwrap(rootQuery, store.path);

  for (const node of query) {
    const args = decodeArgs(node);

    if (isArgObject(args)) {
      promises.push(getByArgs(args, node.children));
    } else {
      idQueries[node.key] = node.children;
    }
  }

  if (!isEmpty(idQueries)) promises.push(getByIds());
  await promises;
  if (refQuery.length) {
    merge(results, await store.call('read', refQuery));
  }

  log(query, results);
  return slice(results, query).known;
}

async function readSql(sqlQuery, client) {
  log(sqlQuery.text);
  log(sqlQuery.values);

  sqlQuery.rowMode = 'array';
  const result = (await client.query(sqlQuery)).rows.flat();
  // Each row is an array, as there is only one column returned.
  log(result);
  return result;
}
