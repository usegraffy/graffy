import { remove, merge, encodePath } from '@graffy/common';
import Db from './Db.js';
/**
 *
 * @param {{
 *    table?: string,
 *    idCol?: string,
 *    verCol?: string,
 *    joins?: Record<string, {
 *        table?: string,
 *        refCol?: string,
 *        verCol?: string,
 *    }>
 *    connection?: any,
 *    schema?: any,
 *    verDefault?: string
 * }} options
 * @returns
 */
export const pg =
  ({ table, idCol, verCol, joins, connection, schema, verDefault }) =>
  (store) => {
    store.on('read', read);
    store.on('write', write);

    const prefix = store.path;
    const tableOpts = {
      prefix,
      table: table || prefix[prefix.length - 1] || 'default',
      idCol: idCol || 'id',
      verCol: verCol || 'updatedAt',
      joins: joins || {},
      schema,
      verDefault,
    };

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
