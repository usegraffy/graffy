import { Pool, Client } from 'pg';
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
  mergeObject,
  decodeQuery,
} from '@graffy/common';
import { selectByArgs, selectByIds } from './sql/select';
import { put, patch } from './sql/index.js';
import debug from 'debug';
const log = debug('graffy:pg:db');

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

  async query(sql) {
    sql.rowMode = 'array';
    log('Making SQL query: ' + sql.text, sql.values);
    try {
      return await this.client.query(sql);
    } catch (e) {
      const message = [
        e.message,
        e.detail,
        e.hint,
        e.where,
        sql.text,
        JSON.stringify(sql.values),
      ]
        .filter(Boolean)
        .join('; ');
      throw Error('pg.sql_error ' + message);
    }
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
    if (!res.rowCount) {
      throw Error('pg.nothing_written ' + sql.text + ' with ' + sql.values);
    }
    return res.rows[0][0];
  }

  async read(rootQuery, tableOptions) {
    const idQueries = {};
    const promises = [];
    const results = [];
    const { prefix } = tableOptions;

    const getByArgs = async (args, projection) => {
      const result = await this.readSql(
        selectByArgs(args, projection, tableOptions),
      );
      const wrappedGraph = encodeGraph(wrapObject(result, prefix));
      log('getByArgs', wrappedGraph);
      merge(results, wrappedGraph);
    };

    const getByIds = async () => {
      // TODO: Calculate a combined projection.
      // Bonus: Strategically split into multiple read operations
      // based on projection.
      const result = await this.readSql(
        selectByIds(Object.keys(idQueries), null, tableOptions),
      );
      result.forEach((object) => {
        const wrappedGraph = encodeGraph(wrapObject(object, prefix));
        log('getByIds', wrappedGraph);
        merge(results, wrappedGraph);
      });
    };

    const query = unwrap(rootQuery, prefix);
    for (const node of query) {
      const args = decodeArgs(node);
      if (isPlainObject(args)) {
        if (node.prefix) {
          for (const childNode of node.children) {
            const childArgs = decodeArgs(childNode);
            const projection = childNode.children
              ? decodeQuery(childNode.children)
              : true;

            promises.push(getByArgs({ ...args, ...childArgs }, projection));
          }
        } else {
          const projection = node.children ? decodeQuery(node.children) : true;
          promises.push(getByArgs(args, projection));
        }
      } else {
        idQueries[node.key] = node.children;
      }
    }

    if (!isEmpty(idQueries)) promises.push(getByIds());
    await Promise.all(promises);

    log('dbRead', rootQuery, results);
    return slice(finalize(results, wrap(query, prefix)), rootQuery).known || [];
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

      const arg = decodeArgs(node);
      const object = decodeGraph(node.children);
      if (isPlainObject(arg)) {
        mergeObject(object, arg);
      } else {
        object.id = arg;
      }

      if (object.$put && object.$put !== true) {
        throw Error('pg_write.partial_put_unsupported');
      }

      object.$put
        ? addToQuery(put(object, arg, tableOptions))
        : addToQuery(patch(object, arg, tableOptions));
    }

    const result = [];
    await Promise.all(
      sqls.map((sql) =>
        this.writeSql(sql).then((object) => {
          merge(result, encodeGraph(wrapObject(object, prefix)));
        }),
      ),
    );
    log('dbWrite', rootChange, result);
    return result;
  }
}
