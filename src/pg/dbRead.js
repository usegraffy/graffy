import { selectByArgs, selectByIds } from './sql';
import { linkResult } from './link';
import pool from './pool';
import { isArgObject, decodeArgs } from '@graffy/common';
import debug from 'debug';
const log = debug('graffy:pg:dbRead');

export default async function dbRead(query, pgOptions) {
  const sqls = [];
  const ids = [];
  const transforms = [];
  const idSubQueries = [];

  for (const node of query) {
    const args = decodeArgs(node);

    if (isArgObject(args)) {
      sqls.push(selectByArgs(args, pgOptions));
      transforms.push((res) => linkResult(res, node.children, pgOptions));
    } else {
      ids.push(node.key);
      idSubQueries.push(node.children);
    }
  }

  if (ids.length) {
    sqls.push(selectByIds(ids, pgOptions));
    transforms.push((res) =>
      res.map(
        (object, i) => linkResult([object], idSubQueries[i], pgOptions)[0],
      ),
    );
  }

  const results = (await Promise.all(sqls.map((sql) => readSql(sql, pool))))
    .map((res, i) => transforms[i](res))
    .flat(2);

  /*
    Why flat(2)?

    The SQL we generate construct JSON objects inside Postgres and produce
    rows with one field each, the constructed JSON. We use rowMode: array to
    so each row is an array containing its one field.

    One row: [{ id: ... }],

    Each SQL query produces an array of rows:

    One SQL query result: [[{ id: 1, ...}], [{ id: 2, ... }], ... ]

    And we make several SQL queries, and wait for them together using
    Promise.all, which gives an array of the results from each SQL query:

    All SQL results: [[[{ id: 1, ...}], [{ id: 2, ... }], ...], ...]

    We therefore use .flat(2) to make this a combined array of objects from
    across all queries:

    What we return: [{ id: 1, ...}], [{ id: 2, ... }]
  */

  log(query, results);
  return results;
}

async function readSql(sqlQuery, client) {
  log(sqlQuery.text);
  log(sqlQuery.values);

  sqlQuery.rowMode = 'array';
  const result = (await client.query(sqlQuery)).rows;
  log(result);
  return result;
}
