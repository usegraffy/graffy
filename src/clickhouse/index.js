import { encodePath, merge, remove } from '@graffy/common';
import Db from './Db.js';

/**
 * @typedef {{
 *  table?: string,
 *  idCol?: string,
 *  verCol?: string,
 *  schema?: any,
 *  database?: string,
 *  final?: boolean
 * }} ClickhouseOptions
 */

/**
 * @param {string} name
 * @param {ClickhouseOptions} [options]
 */
function getTableOpts(name, options = {}) {
  const { table, idCol, verCol, schema, database, final } = options;
  return {
    table: table || name,
    idCol: idCol || 'id',
    verCol: verCol || 'updatedAt',
    database: database || 'default',
    final: final !== false,
    schema,
  };
}

/**
 * @param {ClickhouseOptions & { connection?: any }} [options]
 */
export const clickhouse =
  (options = {}) =>
  (store) => {
    const { connection, ...rawOptions } = options;
    store.on('read', read);

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
  };

export const ch = clickhouse;
