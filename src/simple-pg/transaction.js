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
import { format } from '@graffy/testing';
import debug from 'debug';
const log = debug('graffy:pg:dbRead');

export class Transaction {
  // client is pgClient
  constructor({ client, opts }) {
    this.client = client;
    this.options = opts;
    this.schemas = {};
  }

  setOptions(opts) {
    this.options = opts;
  }

  async dbRead(rootQuery, opts = this.options, store) {
    const client = this.client;
    const idQueries = {};
    const promises = [];
    const results = [];
    const { id, table } = opts;
    opts.table = table || store.path[store.path.length - 1] || 'default';

    async function getByArgs(args, subQuery) {
      let result = await readSql(selectByArgs(args, opts), client);
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
      const result = await readSql(query, client);
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

    async function readSql(sqlQuery, client) {
      log(sqlQuery.text);
      log(sqlQuery.values);

      sqlQuery.rowMode = 'array';
      let result = await client.query(sqlQuery);
      result = result || [];
      result = result.rows.flat();
      // Each row is an array, as there is only one column returned.
      log('ReadSQL', result);
      return result;
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
  }

  async dbWrite(change, opts = this.options, store) {
    async function writeSql(query, client) {
      log(query.text);
      log(query.values);
      query.rowMode = 'array';
      const res = await client.query(query);
      log('Rows written', res.rowCount);
      return res.rowCount;
    }
    const client = this.client;
    const queries = [];
    const { table } = opts;
    opts.table = table || store.path[store.path.length - 1] || 'default';

    const addToQuery = (sql) => queries.push(writeSql(sql, client));

    for (const node of change) {
      if (isRange(node)) {
        throw Error(
          node.key === node.end
            ? 'pg_write.delete_unsupported'
            : 'pg_write.write_range_unsupported',
        );
      }

      const arg = decodeArgs(node);
      const object = decodeGraph(node.children);
      if (object.$put && object.$put !== true)
        throw Error('pg_write.partial_put_unsupported');

      object.$put
        ? addToQuery(put(object, arg, opts))
        : addToQuery(patch(object, arg, opts));
    }

    await Promise.all(queries);

    log(change);
    return change;
  }
}
