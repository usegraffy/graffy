import { encodePath, merge, remove } from '@graffy/common';
import Db from './Db.js';

/**
 * @typedef {{
 *  table?: string,
 *  idCol?: string,
 *  verCol?: string,
 *  schema?: any,
 *  database?: string,
 *  final?: boolean,
 *  joins?: Record<string, {
 *    table?: string,
 *    idCol?: string,
 *    verCol?: string,
 *    schema?: any,
 *    database?: string,
 *    final?: boolean,
 *    refCol?: string,
 *    joins?: Record<string, any>
 *  }>
 * }} ClickhouseOptions
 */

/**
 * @param {string} name
 * @param {ClickhouseOptions} [options]
 * @param {string|null} [parentName]
 * @param {{database?: string, final?: boolean}} [parentDefaults]
 */
function getTableOpts(
  name,
  options = {},
  parentName = null,
  parentDefaults = {},
) {
  const { table, idCol, verCol, schema, database, final } = options;
  const tableName = table || name;
  const tableDatabase = database || parentDefaults.database || 'default';
  const tableFinal = final ?? parentDefaults.final ?? false;

  const joins = Object.fromEntries(
    Object.entries(options.joins || {}).map(([joinName, joinRaw = {}]) => {
      const { refCol = parentName, ...joinOptions } = joinRaw;
      return [
        joinName,
        {
          refCol: refCol || parentName || tableName,
          ...getTableOpts(joinName, joinOptions, tableName, {
            database: tableDatabase,
            final: tableFinal,
          }),
        },
      ];
    }),
  );

  return {
    table: tableName,
    idCol: idCol || 'id',
    verCol: verCol || 'time',
    database: tableDatabase,
    final: tableFinal,
    schema,
    joins,
  };
}

/**
 * @param {ClickhouseOptions & { connection?: any }} [options]
 */
const clickhouse =
  (options = {}) =>
  (store) => {
    const { connection, ...rawOptions } = options;
    store.on('read', read);
    store.on('write', write);

    const prefix = store.path;
    const tableOpts = getTableOpts(prefix[prefix.length - 1], rawOptions);
    tableOpts.prefix = prefix;

    const defaultDb = new Db(connection);

    function read(query, _options, next) {
      const readPromise = defaultDb.read(query, tableOpts);
      const remainingQuery = remove(query, encodePath(prefix));
      const nextPromise = next(remainingQuery);

      return Promise.all([readPromise, nextPromise]).then(
        ([readRes, nextRes]) => {
          return merge(readRes, nextRes);
        },
      );
    }

    function write(change, writeOptions, next) {
      const { chClient, clickhouseClient } = writeOptions || {};
      const db =
        chClient || clickhouseClient
          ? new Db(chClient || clickhouseClient)
          : defaultDb;
      const writePromise = db.write(change, tableOpts);
      const remainingChange = remove(change, encodePath(prefix));
      const nextPromise = next(remainingChange);

      return Promise.all([writePromise, nextPromise]).then(
        ([writeRes, nextRes]) => {
          return merge(writeRes, nextRes);
        },
      );
    }
  };

export default clickhouse;
