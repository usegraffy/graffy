import { Pool } from 'pg';
import debug from 'debug';
const log = (...text) => debug(`graffy:pg:${text.shift()}`)(text);

const pgPool = {};
pgPool.connect = (config) => {
  const pool = new Pool(config);
  pgPool.setPool(pool);
};

pgPool.setPool = (pool) => {
  // the pool will emit an error on behalf of any idle clients
  // it contains if a backend error or network partition happens
  pool.on('error', (err, _) => {
    log('error', 'Unexpected error on idle client', err);
    process.exit(-1);
  });
  pgPool.pool = pool;
};

// customised client
pgPool.setClient = (client) => {
  pgPool.client = client;
};

pgPool.getClient = async () =>
  pgPool.client ? pgPool.client() : pgPool.pool.connect();

pgPool.query = async (query) => {
  if (!pgPool.pool && !pgPool.client)
    throw Error('Connect with postgres db is required!');
  const client = await pgPool.getClient();
  try {
    const res = await client.query(query);
    return res;
  } catch (error) {
    log('error', error);
  }
};

pgPool.select = async (sqlQuery) => {
  log('select', sqlQuery.text);
  log('select', sqlQuery.values);
  // sqlQuery.rowMode = 'array';
  let result = await pgPool.query(sqlQuery);
  result = result || [];
  result = result.rows.flat();
  // Each row is an array, as there is only one column returned.
  log('select', 'ReadSQL', result);
  return result;
};

pgPool.insert = async (query) => {
  log('insert', query.text);
  log('insert', query.values);
  query.rowMode = 'array';
  let res = await pgPool.query(query);
  res = res || { rowCount: 0 };
  log('insert', 'Rows written', res.rowCount);
  return res.rowCount;
};

pgPool.update = async (query) => {
  log('update', query.text);
  log('update', query.values);
  query.rowMode = 'array';
  let res = await pgPool.query(query);
  res = res || { rowCount: 0 };
  log('update', 'Rows updated', res.rowCount);
  return res.rowCount;
};

export default pgPool;
// const ENV_TEST = process.env.NODE_ENV === 'testing';
// let pool = null;
// let users = 0;
//
// export function acquirePool() {
//   if (!pool) pool = new pg.Pool();
//   users++;
//   return pool;
// }
//
// export function releasePool() {
//   users--;
//   if (!users && ENV_TEST) {
//     // If we are in tests, we should end the pool after all tests are finished
//     // for a clean exit.
//     pool.end();
//     pool = null;
//   }
// }
//
// process.on('SIGINT', () => {
//   pool.end();
//   process.exit();
// });
//
// process.on('SIGTERM', () => {
//   pool.end();
//   process.exit();
// });
