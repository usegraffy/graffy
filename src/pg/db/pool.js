import { Pool } from 'pg';
import { config as defaultConfig } from './config';

import debug from 'debug';
const log = (...text) => debug(`graffy:pg:${text.shift()}`)(text);

export class PgDb {
  constructor(config) {
    const {
      connection = defaultConfig().connection,
      poolOption = defaultConfig().poolOption,
      handlers = defaultConfig().handlers,
    } = config;
    this.pool = new Pool({ ...connection, ...poolOption });
    const { onError } = handlers;
    this.pool.on('error', onError);
  }

  async query(sqlQuery, type = 'query') {
    const start = Date.now();
    sqlQuery.rowMode = 'array';
    const client = await this.getClient();
    const res = await client.query(sqlQuery);
    const duration = Date.now() - start;
    log(type, `${{ query: sqlQuery.text, duration, rows: res.rowCount }}`);
    if (type === 'read') {
      let result = res || [];
      result = result.rows.flat();
      // Each row is an array, as there is only one column returned.
      log('ReadSQL', result);
      return result;
    }
    if (type === 'write') {
      log('Rows written', res.rowCount);
      return res.rowCount;
    }

    return res;
  }

  async read(query) {
    return this.query(query, 'read');
  }

  async write(query) {
    return this.query(query, 'write');
  }

  async getClient() {
    const client = await this.pool.connect();
    const query = client.query;
    const release = client.release;
    // set a timeout of 5 seconds, after which we will log this client's last query
    const timeout = setTimeout(() => {
      log('error', 'A client has been checked out for more than 5 seconds!');
      log(
        'error',
        `The last executed query on this client was: ${client.lastQuery}`,
      );
    }, 5000);
    // monkey patch the query method to keep track of the last query executed
    client.query = (...args) => {
      client.lastQuery = args;
      return query.apply(client, args);
    };
    client.release = () => {
      // clear our timeout
      clearTimeout(timeout);
      // set the methods back to their old un-monkey-patched version
      client.query = query;
      client.release = release;
      return release.apply(client);
    };
    return client;
  }

  async dispose() {
    this.pool.end();
  }
}
