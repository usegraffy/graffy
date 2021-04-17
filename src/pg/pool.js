import pg from 'pg';

console.log('This is the actual pool filde');

export default new pg.Pool();

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
