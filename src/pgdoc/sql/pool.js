import pg from 'pg';
const pool = new pg.Pool();

export default pool;

// process.on('exit', () => {
//   console.log('Exiting, ending pool');
//   pool.end();
// });
