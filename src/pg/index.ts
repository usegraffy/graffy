import { encodePath, merge, remove } from '@graffy/common';
import Db from './Db.ts';

/**
 * @typedef {{
 *    table: string,
 *    idCol: string,
 *    verCol: string,
 *    joins: Record<string, Partial<TableOpts> & { refCol: string }>,
 *    schema?: any,
 *    verDefault?: string
 * }} TableOpts
 */

/**
 * @param {string} name
 * @param {Partial<TableOpts>} options
 * @param {string} parentName
 * @returns {TableOpts}
 */

function getTableOpts(
  name,
  {
    table,
    idCol,
    verCol,
    joins,
    schema,
    verDefault,
  }: {
    table?: string;
    idCol?: string;
    verCol?: string;
    joins?: any;
    schema?: any;
    verDefault?: string;
  } = {},
  parentName = null,
) {
  const tableName = table || name;
  return {
    table: table || name,
    idCol: idCol || 'id',
    verCol: verCol || 'updatedAt',
    joins: Object.fromEntries(
      Object.entries(joins || {}).map(([joinName, joinVal]: [string, any]) => {
        const { refCol = parentName, ...joinOptions } = joinVal;
        return [
          joinName,
          {
            refCol,
            ...getTableOpts(joinName, joinOptions, tableName),
          },
        ];
      }),
    ),
    schema,
    verDefault,
  };
}

/**
 * @param {Partial<TableOpts> & {connection: any}} options
 * @returns {Function}
 */
export const pg =
  ({ connection, ...rawOptions }: { connection: any; [key: string]: any }) =>
  (store) => {
    store.on('read', read);
    store.on('write', write);

    const prefix = store.path;
    /** @type {TableOpts & {prefix?: string[]}} */
    const tableOpts = getTableOpts(prefix[prefix.length - 1], rawOptions);
    tableOpts.prefix = prefix;

    const defaultDb = new Db(connection);

    function read(query, options, next) {
      const { pgClient } = options;
      const db = pgClient ? new Db(pgClient) : defaultDb;
      const readPromise = db.read(query, tableOpts);
      const remainingQuery = remove(query, encodePath(prefix));
      const nextPromise = next(remainingQuery);

      return Promise.all([readPromise, nextPromise]).then(
        ([readRes, nextRes]) => {
          return merge(readRes, nextRes);
        },
      );
    }

    function write(change, options, next) {
      const { pgClient } = options;
      const db = pgClient ? new Db(pgClient) : defaultDb;
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
