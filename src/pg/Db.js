import pg from 'pg';
import sqlTag from 'sql-template-tag';
import {
  isPlainObject,
  decodeArgs,
  wrap,
  unwrap,
  finalize,
  merge,
  wrapObject,
  encodeGraph,
  isEmpty,
  isRange,
  decodeGraph,
  mergeObject,
  decodeQuery,
} from '@graffy/common';
import { selectByArgs, selectByIds } from './sql/select';
import { put, patch, del } from './sql/index.js';
import debug from 'debug';
const log = debug('graffy:pg:db');
const { Pool, Client, types } = pg;

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
    log('Making SQL query: ' + sql.text, sql.values);
    try {
      sql.types = {
        getTypeParser: (oid, format) => {
          if (oid === types.builtins.INT8) {
            return (value) => parseInt(value, 10);
          }
          return types.getTypeParser(oid, format);
        },
      };
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
    const result = (await this.query(sql)).rows;
    // Each row is an array, as there is only one column returned.
    log('Read result', result);
    return result;
  }

  async writeSql(sql) {
    const res = await this.query(sql);
    log('Rows written', res.rowCount);
    if (!res.rowCount) {
      throw Error('pg.nothing_written ' + sql.text + ' with ' + sql.values);
    }
    return res.rows[0];
  }

  /*
    Adds .schema to tableOptions if it doesn't exist yet.
    It mutates the argument, to "persist" the results and
    avoid this query in every operation. 
  */
  async ensureSchema(tableOptions) {
    if (tableOptions.schema) return;
    const { table, verCol } = tableOptions;

    const tableSchema = (
      await this.query(sqlTag`
        SELECT table_schema
        FROM information_schema.tables
        WHERE table_name = ${table}
        ORDER BY array_position(current_schemas(false)::text[], table_schema::text) ASC
        LIMIT 1`)
    ).rows[0].table_schema;

    const types = (
      await this.query(sqlTag`
        SELECT jsonb_object_agg(column_name, udt_name) AS column_types
        FROM information_schema.columns
        WHERE
          table_name = ${table} AND
          table_schema = ${tableSchema}`)
    ).rows[0].column_types;

    if (!types) throw Error(`pg.missing_table ${table}`);

    const verDefault = (
      await this.query(sqlTag`
        SELECT column_default
        FROM information_schema.columns
        WHERE
          table_name = ${table} AND
          table_schema = ${tableSchema} AND
          column_name = ${verCol}`)
    ).rows[0].column_default;

    if (!verDefault) {
      throw Error(`pg.verCol_without_default ${verCol}`);
    }

    log('ensureSchema', types);
    tableOptions.schema = { types };
    tableOptions.verDefault = verDefault;
  }

  async read(rootQuery, tableOptions) {
    const idQueries = {};
    const promises = [];
    const results = [];
    const { prefix } = tableOptions;

    await this.ensureSchema(tableOptions);

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
              : null;

            promises.push(getByArgs({ ...args, ...childArgs }, projection));
          }
        } else {
          const projection = node.children ? decodeQuery(node.children) : null;
          promises.push(getByArgs(args, projection));
        }
      } else {
        idQueries[node.key] = node.children;
      }
    }

    if (!isEmpty(idQueries)) promises.push(getByIds());
    await Promise.all(promises);

    log('dbRead', rootQuery, results);
    return finalize(results, wrap(query, prefix));
  }

  async write(rootChange, tableOptions) {
    const { prefix } = tableOptions;

    await this.ensureSchema(tableOptions);

    const change = unwrap(rootChange, prefix);

    const sqls = change.map((node) => {
      const arg = decodeArgs(node);

      if (isRange(node)) {
        if (node.key === node.end) return del(arg, tableOptions);
        throw Error('pg_write.write_range_unsupported');
      }

      const object = decodeGraph(node.children);
      if (isPlainObject(arg)) {
        mergeObject(object, arg);
      } else {
        object.id = arg;
      }

      if (object.$put && object.$put !== true) {
        throw Error('pg_write.partial_put_unsupported');
      }

      return object.$put
        ? put(object, arg, tableOptions)
        : patch(object, arg, tableOptions);
    });

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
