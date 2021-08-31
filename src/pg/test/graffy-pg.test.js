import Graffy from '@graffy/core';
import pg, { setPool } from '../index.js';
import { populate } from './setup.js';
import { Pool } from 'pg';

const setEnv = () => {
  process.env.PGDATABASE = 'lego';
  process.env.PGUSER = 'postgres';
  process.env.PGPASSWORD = 'postgres';
  process.env.PGHOST = 'localhost';
};
describe('postgres', () => {
  let store;

  beforeEach(async () => {
    setEnv();
    await populate();
    jest.useFakeTimers();
    store = new Graffy();
    // connect({
    //   database: process.env.PGDATABASE,
    //   user: process.env.PGUSER,
    //   password: process.env.PGPASSWORD,
    //   host: process.env.PGHOST,
    //   port: parseInt(process.env.PGPORT || '5432'),
    // });
    const pool = new Pool({
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432'),
    });
    setPool(pool);
    store.use('user', pg());
  });

  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('scenario 1', async () => {
    const result1 = await store.read('user.user0', { i: 1 });

    expect(result1).toEqual({ i: 0 });

    const response1 = await store.write('user.user1', {
      i: 2,
    });

    expect(response1).toEqual({ i: 2 });
  });

  // something is not right with default value
  test('scenario 2', async () => {
    const result1 = await store.write('user.user0', {
      i: 1,
      $put: true,
    });
    console.log(result1);
  });

  // test('scenario 3', async () => {
  // }
});
