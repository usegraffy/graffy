import Db from './Db.js';
import { Pool, Client } from 'pg';

export const pg =
  ({ table, idCol, verCol, links, connection }) =>
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
      links: links || {},
    };

    const defaultDb = new Db(connection);

    function read(query, options) {
      const { transactionDb = defaultDb, ...readOpts } = options;
      return transactionDb.read(query, tableOpts, readOpts);
    }

    function write(change, options) {
      const { transactionDb = defaultDb, ...writeOpts } = options;
      return transactionDb.write(change, tableOpts, writeOpts);
    }
  };

export const transaction =
  ({ connection }) =>
  async (store) => {
    store.on('write', async (change, options, next) => {
      let pool;
      if (connection instanceof Pool) {
        pool = connection;
      } else if (connection instanceof Client) {
        throw new Error('pg.transaction_mustBePool');
      } else {
        pool = new Pool(connection);
      }

      const client = await pool.connect();
      await client.query('BEGIN');
      const transactionDb = new Db(connection);

      const nextOptions = { ...options, transactionDb };
      try {
        const response = await next(change, nextOptions);
        await client.query('COMMIT');
        return response;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        await client.release();
      }
    });
  };
