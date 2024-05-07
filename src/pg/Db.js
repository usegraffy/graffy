import {
  cmp,
  decodeArgs,
  decodeGraph,
  decodeQuery,
  encodeGraph,
  encodePath,
  finalize,
  isEmpty,
  isPlainObject,
  isRange,
  merge,
  mergeObject,
  unwrap,
  wrap,
  wrapObject,
} from '@graffy/common';
import debug from 'debug';
import pg from 'pg';
import sqlTag from 'sql-template-tag';
import { del, patch, put, selectByArgs, selectByIds } from './sql/index.js';
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

  async query(sql, tableOptions) {
    log(`Making SQL query: ${sql.text}`, sql.values);
    const cubeOid =
      Number.parseInt(tableOptions?.schema?.typeOids?.cube || '0') || null;
    try {
      sql.types = {
        getTypeParser: (oid, format) => {
          if (oid === types.builtins.INT8) {
            return (value) => Number.parseInt(value, 10);
          }
          if (oid === cubeOid) {
            return (value) => {
              const array = value
                .slice(1, -1)
                .split(/\)\s*,\s*\(/)
                .map((corner) =>
                  corner
                    .split(',')
                    .map((coord) => Number.parseFloat(coord.trim())),
                );
              return array.length > 1 ? array : array[0];
            };
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
      throw Error(`pg.sql_error ${message}`);
    }
  }

  async readSql(sql, tableOptions) {
    const result = (await this.query(sql, tableOptions)).rows;
    // Each row is an array, as there is only one column returned.
    log('Read result', result);
    return result;
  }

  async writeSql(sql, tableOptions) {
    const res = await this.query(sql, tableOptions);
    log('Rows written', res.rowCount);
    if (!res.rowCount) {
      throw Error(`pg.nothing_written ${sql.text} with ${sql.values}`);
    }
    return res.rows;
  }

  /*
    Adds .schema to tableOptions if it doesn't exist yet.
    It mutates the argument, to "persist" the results and
    avoid this query in every operation. 
  */
  async ensureSchema(tableOptions, typeOids) {
    if (tableOptions.schema) return;
    const { table, verCol, joins } = tableOptions;

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

    typeOids =
      typeOids ||
      (
        await this.query(sqlTag`
        SELECT jsonb_object_agg(typname, oid) AS type_oids
        FROM pg_type
        WHERE typname = 'cube'`)
      ).rows[0].type_oids;

    // console.log({ typeOids });

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

    await Promise.all(
      Object.values(joins).map((joinOptions) =>
        this.ensureSchema(joinOptions, typeOids),
      ),
    );

    log('ensureSchema', types);
    tableOptions.schema = { types, typeOids };
    tableOptions.verDefault = verDefault;
  }

  async read(rootQuery, tableOptions) {
    const idQueries = {};
    const promises = [];
    const results = [];
    const { prefix: rawPrefix } = tableOptions;
    const prefix = encodePath(rawPrefix);

    await this.ensureSchema(tableOptions);

    const getByArgs = async (args, projection) => {
      const result = await this.readSql(
        selectByArgs(args, projection, tableOptions),
        tableOptions,
      );
      const wrappedGraph = encodeGraph(wrapObject(result, rawPrefix));
      log('getByArgs', wrappedGraph);
      merge(results, wrappedGraph);
    };

    const getByIds = async () => {
      // TODO: Calculate a combined projection.
      // Bonus: Strategically split into multiple read operations
      // based on projection.
      const result = await this.readSql(
        selectByIds(Object.keys(idQueries), null, tableOptions),
        tableOptions,
      );
      for (const object of result) {
        const wrappedGraph = encodeGraph(wrapObject(object, rawPrefix));
        log('getByIds', wrappedGraph);
        merge(results, wrappedGraph);
      }
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
        idQueries[args] = node.children;
      }
    }

    if (!isEmpty(idQueries)) promises.push(getByIds());
    await Promise.all(promises);

    log('dbRead', rootQuery, results);
    return finalize(results, wrap(query, prefix));
  }

  async write(rootChange, tableOptions) {
    const { prefix: rawPrefix } = tableOptions;
    const prefix = encodePath(rawPrefix);

    await this.ensureSchema(tableOptions);

    const change = unwrap(rootChange, prefix);

    const puts = [];
    const sqls = [];
    for (const node of change) {
      const arg = decodeArgs(node);

      if (isRange(node)) {
        if (cmp(node.key, node.end) === 0) {
          log('delete', node);
          sqls.push(del(arg, tableOptions));
          continue;
        }
        throw Error('pg_write.write_range_unsupported');
      }

      const object = decodeGraph(node.children);
      if (isPlainObject(arg)) {
        mergeObject(object, arg);
      } else {
        object[tableOptions.idCol] = arg;
      }

      if (object.$put && object.$put !== true) {
        throw Error('pg_write.partial_put_unsupported');
      }

      if (object.$put) {
        puts.push([object, arg]);
      } else {
        sqls.push(patch(object, arg, tableOptions));
      }
    }

    if (puts.length) sqls.push(...put(puts, tableOptions));

    const result = [];
    await Promise.all(
      sqls.map((sql) =>
        this.writeSql(sql, tableOptions).then((object) => {
          log('returned_object_wrapped', wrapObject(object, rawPrefix));
          merge(result, encodeGraph(wrapObject(object, rawPrefix)));
        }),
      ),
    );
    log('dbWrite', rootChange, result);
    return result;
  }
}
