import { remove, merge } from '@graffy/common';
import Db from './Db.js';
/**
 *
 * @param {{table?: string, idCol?: string, verCol?: string, connection?: any}} param0
 * @returns
 */
export const pg =
  ({ table, idCol, verCol, connection }) =>
  (store) => {
    store.on('read', read);
    store.on('write', write);

    // TODO: Make the defaults smarter using introspection.
    const prefix = store.path;
    const tableOpts = {
      prefix,
      table: table || prefix[prefix.length - 1] || 'default',
      idCol: idCol || 'id',
      verCol: verCol || 'updatedAt',
    };

    const defaultDb = new Db(connection);

    function read(query, options, next) {
      const { pgClient } = options;
      const db = pgClient ? new Db(pgClient) : defaultDb;
      const readPromise = db.read(query, tableOpts);
      const remainingQuery = remove(query, prefix);
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
      const remainingChange = remove(change, prefix);
      const nextPromise = next(remainingChange);

      return Promise.all([writePromise, nextPromise]).then(
        ([writeRes, nextRes]) => {
          return merge(writeRes, nextRes);
        },
      );
    }
  };

/*
  TODO: Uncomment and test in another PR.
  
  export const transaction = ({ connection }) => {
    store.on('write', (change, options, next) => {
      const client = await pool.connect();
      await client.query('BEGIN');
      const db = new Db(client);

      nextOptions = { ...options, db };
      try {
        const response = await next(change, nextOptions);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK')
      } finally {
        await client.release();
      }
    })
  }
*/
