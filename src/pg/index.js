import Db from './Db.js';
/**
 *
 * @param {{table?: string, idCol?: string, verCol?: string, links?: object, connection?: any}} param0
 * @returns
 */
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

/*
  TODO: Uncomment and test in another PR.
  
  export const transaction = ({ connection }) => {
    store.on('write', (change, options, next) => {
      const client = await pool.connect();
      await client.query('BEGIN');
      const transactionDb = new Db(client);

      nextOptions = { ...options, transactionDb };
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
