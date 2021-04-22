import pg from 'pg';

const pool = new pg.Pool();

export default pool;

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
