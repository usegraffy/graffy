import { createClient } from '@clickhouse/client';
import {
  decodeArgs,
  decodeQuery,
  encodeGraph,
  encodePath,
  finalize,
  isEmpty,
  isPlainObject,
  merge,
  unwrap,
  wrap,
  wrapObject,
} from '@graffy/common';
import { literal } from './sql/escape.js';
import { selectByArgs, selectByIds } from './sql/select.js';

function maybeParseJson(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (trimmed === 'null') return null;
  if (
    (trimmed[0] === '{' && trimmed[trimmed.length - 1] === '}') ||
    (trimmed[0] === '[' && trimmed[trimmed.length - 1] === ']')
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function deepCloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyAggregateAliases(object, aggregateAliases) {
  Object.entries(aggregateAliases).forEach(([alias, { op, prop }]) => {
    if (!(alias in object)) return;
    if (!object[op] || typeof object[op] !== 'object') object[op] = {};
    object[op][prop] = object[alias];
    delete object[alias];
  });
}

export default class Db {
  constructor(connection) {
    if (connection?.query && typeof connection.query === 'function') {
      this.client = connection;
    } else {
      this.client = createClient(connection || {});
    }
  }

  async query(sql) {
    try {
      const resultSet = await this.client.query({
        query: sql,
        format: 'JSONEachRow',
      });

      if (Array.isArray(resultSet)) return resultSet;
      if (resultSet?.data && Array.isArray(resultSet.data))
        return resultSet.data;
      if (typeof resultSet?.json === 'function') {
        const rows = await resultSet.json();
        return Array.isArray(rows) ? rows : [];
      }

      return [];
    } catch (e) {
      const message = [e?.message, sql].filter(Boolean).join('; ');
      throw Error(`clickhouse.sql_error ${message}`);
    }
  }

  async ensureSchema(tableOptions) {
    if (!tableOptions.schema?.types) {
      const rows = await this.query(`
        SELECT name, type
        FROM system.columns
        WHERE database = ${literal(tableOptions.database || 'default')}
        AND table = ${literal(tableOptions.table)}
        ORDER BY position
      `);

      if (!rows.length) {
        throw Error(`clickhouse.missing_table ${tableOptions.table}`);
      }

      tableOptions.schema = {
        types: Object.fromEntries(rows.map(({ name, type }) => [name, type])),
      };
    }

    await Promise.all(
      Object.values(tableOptions.joins || {}).map((joinOptions) =>
        this.ensureSchema(joinOptions),
      ),
    );
  }

  normalizeRow(row, schema) {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      const type = schema?.types?.[key];
      if (value === null || value === undefined) {
        out[key] = null;
      } else if (type === 'UInt8' || type === 'Nullable(UInt8)') {
        out[key] = Boolean(value);
      } else if (type === 'String' || type === 'Nullable(String)') {
        out[key] = maybeParseJson(value);
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  getCursorValue(row, orderItem) {
    const isDesc = orderItem[0] === '!';
    const prop = isDesc ? orderItem.slice(1) : orderItem;
    const path = prop.split('.');

    let value = row[path[0]];
    for (let i = 1; i < path.length; i += 1) {
      value = value?.[path[i]];
    }

    if (value === undefined) value = null;
    if (!isDesc || value === null) return value;

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw Error(`clickhouse.cursor_desc_non_numeric ${prop}`);
    }
    return -numeric;
  }

  async read(rootQuery, tableOptions) {
    const idQueries = {};
    const promises = [];
    const results = [];
    const { prefix: rawPrefix } = tableOptions;
    const prefix = encodePath(rawPrefix);

    await this.ensureSchema(tableOptions);

    const getByArgs = async (args, projection) => {
      const selection = selectByArgs(args, projection, tableOptions);
      const rows = await this.query(selection.sql);
      if (selection.ensureSingleRow && rows.length > 1) {
        throw Error(`clickhouse.more_than_one_row ${tableOptions.table}`);
      }

      const wrappedRows = rows.map((row) => {
        const object = this.normalizeRow(row, tableOptions.schema);
        applyAggregateAliases(object, selection.aggregateAliases || {});

        const key = deepCloneJson(selection.keyBase);
        if (selection.isAggregate && selection.groupAliases?.length) {
          key.$cursor = selection.groupAliases.map((alias) => object[alias]);
        } else if (selection.hasRangeArg && selection.hasCursor) {
          key.$cursor = selection.orderSpec.map((orderItem) =>
            this.getCursorValue(object, orderItem),
          );
        }

        (selection.groupAliases || []).forEach((alias) => {
          delete object[alias];
        });

        object.$key = key;
        object.$ver = object[tableOptions.verCol] ?? object._version ?? null;
        if (!selection.isAggregate) {
          object.$ref = [...rawPrefix, object[tableOptions.idCol]];
        }
        return object;
      });

      merge(results, encodeGraph(wrapObject(wrappedRows, rawPrefix)));
    };

    const getByIds = async () => {
      const selection = selectByIds(Object.keys(idQueries), tableOptions);
      const rows = await this.query(selection.sql);
      for (const row of rows) {
        const object = this.normalizeRow(row, tableOptions.schema);
        object.$key = object[tableOptions.idCol];
        object.$ver = object[tableOptions.verCol] ?? object._version ?? null;
        merge(results, encodeGraph(wrapObject(object, rawPrefix)));
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
    return finalize(results, wrap(query, prefix));
  }
}
