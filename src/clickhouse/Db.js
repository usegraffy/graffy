import { randomUUID } from 'node:crypto';
import { createClient } from '@clickhouse/client';
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
import { isStringishType, isUInt8Type, literal } from './sql/escape.js';
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

function isNumericType(type) {
  return /\b(?:U?Int|Float|Decimal)\d*\b/.test(type || '');
}

function formatDateTime(value, includeMilliseconds) {
  const iso = new Date(value).toISOString();
  return includeMilliseconds
    ? iso.replace('T', ' ').replace('Z', '')
    : iso.slice(0, 19).replace('T', ' ');
}

function nextVersionValue(type, previousValue, providedValue) {
  if (providedValue !== undefined && providedValue !== null) return providedValue;

  if (type?.startsWith('DateTime64')) {
    const previousMs = Number.parseInt(
      new Date(previousValue || 0).getTime().toString(),
      10,
    );
    const nextMs = Number.isFinite(previousMs)
      ? Math.max(Date.now(), previousMs + 1)
      : Date.now();
    return formatDateTime(nextMs, true);
  }

  if (type?.startsWith('DateTime')) {
    const previousMs = Number.parseInt(
      new Date(previousValue || 0).getTime().toString(),
      10,
    );
    const nextMs = Number.isFinite(previousMs)
      ? Math.max(Date.now(), previousMs + 1000)
      : Date.now();
    return formatDateTime(nextMs, false);
  }

  if (isNumericType(type)) {
    const previousNum = Number(previousValue);
    return Number.isFinite(previousNum)
      ? Math.max(Date.now(), previousNum + 1)
      : Date.now();
  }

  if (isStringishType(type)) {
    const previousNum = Number(previousValue);
    const nextNum = Number.isFinite(previousNum)
      ? Math.max(Date.now(), previousNum + 1)
      : Date.now();
    return String(nextNum);
  }

  const previousNum = Number(previousValue);
  return Number.isFinite(previousNum)
    ? Math.max(Date.now(), previousNum + 1)
    : Date.now();
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

function mergeJsonValue(baseValue, changeValue) {
  if (
    changeValue === null ||
    changeValue === undefined ||
    Array.isArray(changeValue) ||
    !isPlainObject(changeValue) ||
    changeValue.$put === true ||
    '$val' in changeValue
  ) {
    return stripJsonValue(changeValue);
  }

  const source = isPlainObject(baseValue) ? deepCloneJson(baseValue) : {};
  for (const [key, item] of Object.entries(changeValue)) {
    if (key[0] === '$') continue;
    const next = mergeJsonValue(source[key], item);
    if (next === undefined || next === null) {
      delete source[key];
    } else {
      source[key] = next;
    }
  }

  return isEmpty(source) ? null : source;
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

  async insert(tableOptions, rows) {
    if (!rows.length) return;

    try {
      await this.client.insert({
        table: `${tableOptions.database || 'default'}.${tableOptions.table}`,
        values: rows,
        format: 'JSONEachRow',
      });
    } catch (e) {
      const message = [e?.message, JSON.stringify(rows)].filter(Boolean).join(
        '; ',
      );
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

  async getExistingRow(arg, tableOptions) {
    const selection = isPlainObject(arg)
      ? selectByArgs(arg, null, tableOptions)
      : selectByIds([arg], tableOptions);
    const rows = await this.query(selection.sql);
    if (rows.length > 1) {
      throw Error(`clickhouse.more_than_one_row ${tableOptions.table}`);
    }
    return rows[0] ? this.normalizeRow(rows[0], tableOptions.schema) : null;
  }

  ensureRowId(row, arg, tableOptions) {
    const { idCol } = tableOptions;

    if (row[idCol] !== undefined && row[idCol] !== null) return row[idCol];
    if (!isPlainObject(arg)) {
      row[idCol] = arg;
      return row[idCol];
    }
    if (arg[idCol] !== undefined && arg[idCol] !== null) {
      row[idCol] = arg[idCol];
      return row[idCol];
    }

    const idType = tableOptions.schema?.types?.[idCol];
    if (!isStringishType(idType)) {
      throw Error(`clickhouse.write_missing_id ${idCol}`);
    }

    row[idCol] = randomUUID();
    return row[idCol];
  }

  applyRowChange(row, change, tableOptions, isPut) {
    for (const [col, value] of Object.entries(change)) {
      if (col[0] === '$') continue;

      const type = tableOptions.schema?.types?.[col];
      if (
        isStringishType(type) &&
        (value === null || Array.isArray(value) || isPlainObject(value))
      ) {
        row[col] =
          isPut || Array.isArray(value)
            ? stripJsonValue(value)
            : mergeJsonValue(row[col], value);
      } else {
        row[col] = value;
      }
    }
  }

  getWriteRow(existing, change, arg, tableOptions, isPut, isDelete = false) {
    const row = existing ? deepCloneJson(existing) : {};
    const providedVersion = change[tableOptions.verCol];

    this.applyRowChange(row, change, tableOptions, isPut);
    this.ensureRowId(row, arg, tableOptions);

    if (tableOptions.schema?.types?._sign) {
      row._sign = isDelete ? 0 : 1;
    } else if (isDelete) {
      throw Error('clickhouse.delete_requires_sign');
    }

    row[tableOptions.verCol] = nextVersionValue(
      tableOptions.schema?.types?.[tableOptions.verCol],
      existing?.[tableOptions.verCol],
      providedVersion,
    );

    return row;
  }

  getInsertRow(row, tableOptions) {
    const out = {};
    for (const [col, type] of Object.entries(tableOptions.schema?.types || {})) {
      if (!(col in row)) continue;

      const value = row[col];
      if (value === undefined) continue;

      if (value === null) {
        out[col] = null;
      } else if (isUInt8Type(type)) {
        out[col] = value ? 1 : 0;
      } else if (col === '_sign') {
        out[col] = Number(value);
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

  async write(rootChange, tableOptions) {
    const { prefix: rawPrefix } = tableOptions;
    const prefix = encodePath(rawPrefix);

    await this.ensureSchema(tableOptions);

    const change = unwrap(rootChange, prefix);
    const result = [];

    for (const node of change) {
      const arg = decodeArgs(node);

      if (isRange(node)) {
        if (cmp(node.key, node.end) !== 0) {
          throw Error('clickhouse_write.write_range_unsupported');
        }

        const existing = await this.getExistingRow(arg, tableOptions);
        if (!existing) {
          throw Error(`clickhouse.nothing_written ${JSON.stringify(arg)}`);
        }

        const tombstone = this.getWriteRow(
          existing,
          {},
          arg,
          tableOptions,
          false,
          true,
        );
        await this.insert(tableOptions, [
          this.getInsertRow(tombstone, tableOptions),
        ]);
        merge(result, encodeGraph(wrapObject({ $key: arg }, rawPrefix)));
        continue;
      }

      const object = decodeGraph(node.children) || {};
      if (isPlainObject(arg)) {
        mergeObject(object, arg);
      } else {
        object[tableOptions.idCol] = arg;
      }

      if (object.$put && object.$put !== true) {
        throw Error('clickhouse_write.partial_put_unsupported');
      }

      const isPut = object.$put === true;
      const existing = await this.getExistingRow(arg, tableOptions);
      if (!isPut && !existing) {
        throw Error(`clickhouse.nothing_written ${JSON.stringify(arg)}`);
      }

      const writtenRow = this.getWriteRow(
        existing,
        object,
        arg,
        tableOptions,
        isPut,
      );

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
              $ver: writtenRow[tableOptions.verCol] ?? null,
            },
            rawPrefix,
          ),
        ),
      );

      if (isPlainObject(arg)) {
        merge(
          result,
          encodeGraph(
            wrapObject(
              {
                $key: arg,
                $ref: [...rawPrefix, writtenRow[tableOptions.idCol]],
              },
              rawPrefix,
            ),
          ),
        );
      }
    }

    return result;
  }
}
