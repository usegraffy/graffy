import { Pool, Client } from 'pg';
import {
  add,
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
import { linkResult } from './link/index.js';
import { selectByArgs, selectByIds } from './sql/select';
import { put, patch } from './sql/index.js';
import debug from 'debug';
const log = debug('graffy:pg:dbwrap');

export default class Db {
  constructor(connection) {
    if (
      typeof connection === 'object' &&
      connection &&
      (connection instanceof Pool || connection instanceof Client)
    ) {
      this.client = connection;
    } else {
      this.client = new Pool(connection);
    }
  }

  async query(sqlQuery) {
    const start = Date.now();
    sqlQuery.rowMode = 'array';
    const res = await this.client.query(sqlQuery);
    const duration = Date.now() - start;
    log('query', {
      query: sqlQuery.text,
      duration,
      res,
    });
    return res;
  }

  async readSql(sql) {
    let result = await this.query(sql);
    // Each row is an array, as there is only one column returned.
    result = result.rows.flat();
    log('Read result', result);
    return result;
  }

  async writeSql(sql) {
    let res = await this.query(sql);
    log('Rows written', res.rowCount);
    return res.rowCount;
  }

  async read(rootQuery, tableOptions) {
    const idQueries = {};
    const promises = [];
    const results = [];
    const refQuery = [];
    const { idCol, prefix } = tableOptions;

    const getByArgs = async (args, subQuery) => {
      const result = await this.readSql(selectByArgs(args, tableOptions));
      add(refQuery, linkResult(result, subQuery, tableOptions));

      const wrappedQuery = wrap(subQuery, [...prefix, args]);
      const wrappedGraph = encodeGraph(wrapObject(result, prefix));

      log(
        'getByArgs',
        wrappedGraph,
        wrappedQuery,
        finalize(wrappedGraph, wrappedQuery),
      );

      merge(results, finalize(wrappedGraph, wrappedQuery));
    };

    const getByIds = async () => {
      const result = await this.readSql(
        selectByIds(Object.keys(idQueries), tableOptions),
      );
      result.forEach((object) => {
        const id = object[idCol];
        const subQuery = idQueries[id];
        add(refQuery, linkResult([object], subQuery, tableOptions));
        const wrappedQuery = wrap(subQuery, [...prefix, id]);
        const wrappedGraph = encodeGraph(wrapObject(object, prefix));

        log(
          'getByIds',
          wrappedGraph,
          wrappedQuery,
          finalize(wrappedGraph, wrappedQuery),
        );

        merge(results, finalize(wrappedGraph, wrappedQuery));
      });
    };

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

    log('dbRead', rootQuery, results);
    return slice(results, rootQuery).known || [];
  }

  async write(rootChange, tableOptions) {
    const sqls = [];
    const addToQuery = (sql) => sqls.push(sql);
    const { prefix } = tableOptions;

    const change = unwrap(rootChange, prefix);
    for (const node of change) {
      if (isRange(node)) {
        throw Error(
          node.key === node.end
            ? 'pg_write.delete_unsupported'
            : 'pg_write.write_range_unsupported',
        );
      }

      const object = decodeGraph(node.children);
      const arg = decodeArgs(node);

      if (object.$put && object.$put !== true)
        throw Error('pg_write.partial_put_unsupported');

      object.$put
        ? addToQuery(put(object, arg, tableOptions))
        : addToQuery(patch(object, arg, tableOptions));
    }

    await Promise.all(sqls.map((sql) => this.writeSql(sql)));
    return rootChange;
  }
}
