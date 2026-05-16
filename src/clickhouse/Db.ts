import { createClient } from '@clickhouse/client';
import {
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
  unwrap,
  wrap,
  wrapObject,
} from '@graffy/common';
import {
  isStringishType,
  isUInt8Type,
  literal,
  quoteIdent,
} from './sql/escape.ts';
import { selectByArgs, selectByIds } from './sql/select.ts';

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

function stripJsonValue(value) {
  if (value === undefined || value === null) return value ?? null;
  if (Array.isArray(value)) return value.map((item) => stripJsonValue(item));
  if (!isPlainObject(value)) return value;
  if ('$val' in value) return stripJsonValue(value.$val);

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (key[0] === '$') continue;
    const next = stripJsonValue(item);
    if (next === undefined || next === null) continue;
    out[key] = next;
  }

  return isEmpty(out) ? null : out;
}

function applyAggregateAliases(object, aggregateAliases) {
  Object.entries(aggregateAliases).forEach(
    ([alias, aliasVal]: [string, any]) => {
      const { op, prop } = aliasVal;
      if (!(alias in object)) return;
      if (!object[op] || typeof object[op] !== 'object') object[op] = {};
      object[op][prop] = object[alias];
      delete object[alias];
    },
  );
}

export default class Db {
  client: any;

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

  async insert(tableOptions, rows) {
    if (!rows.length) return;

    try {
      await this.client.insert({
        table: `${quoteIdent(tableOptions.database || 'default')}.${quoteIdent(tableOptions.table)}`,
        values: rows,
        format: 'JSONEachRow',
      });
    } catch (e) {
      const message = [e?.message, JSON.stringify(rows)]
        .filter(Boolean)
        .join('; ');
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

  normalizeRow(row, schema): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      const type = schema?.types?.[key];
      if (value === null || value === undefined) {
        out[key] = null;
      } else if (isUInt8Type(type)) {
        out[key] = Boolean(value);
      } else if (isStringishType(type)) {
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

  applyRowChange(row, change, tableOptions) {
    for (const [col, value] of Object.entries(change)) {
      if (col[0] === '$') continue;

      const type = tableOptions.schema?.types?.[col];
      if (
        isStringishType(type) &&
        (value === null || Array.isArray(value) || isPlainObject(value))
      ) {
        row[col] = stripJsonValue(value);
      } else {
        row[col] = value;
      }
    }
  }

  getWriteRow(change, tableOptions) {
    const row = {};
    this.applyRowChange(row, change, tableOptions);
    return row;
  }

  getInsertRow(row, tableOptions) {
    const out = {};
    for (const [col, type] of Object.entries(
      tableOptions.schema?.types || {},
    )) {
      if (!(col in row)) continue;

      const value = row[col];
      if (value === undefined) continue;

      if (value === null) {
        out[col] = null;
      } else if (isUInt8Type(type)) {
        out[col] = value ? 1 : 0;
      } else if (isStringishType(type) && typeof value === 'object') {
        out[col] = JSON.stringify(value);
      } else {
        out[col] = value;
      }
    }
    return out;
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
        } else if (
          selection.isAggregate &&
          selection.groupSpec === true &&
          selection.hasRangeArg
        ) {
          // Keep parity with PG: grouped aggregate + range args uses a
          // synthetic cursor so range finalization can preserve the row.
          key.$cursor = '';
        } else if (selection.hasRangeArg && selection.hasCursor) {
          key.$cursor = selection.orderSpec.map((orderItem) =>
            this.getCursorValue(object, orderItem),
          );
        }

        (selection.groupAliases || []).forEach((alias) => {
          delete object[alias];
        });

        object.$key = key;
        object.$ver = object[tableOptions.verCol];
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
        object.$ver = object[tableOptions.verCol];
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

  async write(rootChange, tableOptions) {
    const { prefix: rawPrefix } = tableOptions;
    const prefix = encodePath(rawPrefix);

    await this.ensureSchema(tableOptions);

    const change = unwrap(rootChange, prefix);
    const result = [];

    for (const node of change) {
      if (isRange(node)) {
        throw Error('clickhouse_write.delete_unsupported');
      }

      const arg = decodeArgs(node);
      const object: any = decodeGraph(node.children) || {};
      if (isPlainObject(arg)) {
        throw Error('clickhouse_write.object_arg_unsupported');
      }

      if (!object.$put || object.$put !== true) {
        throw Error('clickhouse_write.put_required');
      }

      object[tableOptions.idCol] = arg;

      const writtenRow = this.getWriteRow(object, tableOptions);

      await this.insert(tableOptions, [
        this.getInsertRow(writtenRow, tableOptions),
      ]);

      merge(
        result,
        encodeGraph(
          wrapObject(
            {
              ...writtenRow,
              $key: writtenRow[tableOptions.idCol],
              $ver: writtenRow[tableOptions.verCol],
            },
            rawPrefix,
          ),
        ),
      );
    }

    return result;
  }
}
