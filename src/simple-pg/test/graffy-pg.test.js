import Graffy from '@graffy/core';
import pg from '../index.js';
import { populate } from './setup.js';
import { Pool } from 'pg';

const setEnv = () => {
  process.env.PGDATABASE = 'lego';
  process.env.PGUSER = 'postgres';
  process.env.PGPASSWORD = 'postgres';
  process.env.PGHOST = 'localhost';
};

describe.skip('postgres', () => {
  let store;

  beforeEach(async () => {
    setEnv();
    const pool = new Pool({
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      host: process.env.PGHOST,
      port: parseInt(process.env.PGPORT || '5432'),
    });
    const client = await pool.connect();
    await populate(client);

    jest.useFakeTimers();
    store = new Graffy();
    store.use(
      'users',
      pg({
        client: client,
        opts: {
          table: 'users',
          id: 'id',
          version: 'version',
        },
      }),
    );
  });

  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('scenario 1', async () => {
    const result1 = await store.read('users.user0', { name: true });
    expect(result1).toEqual({ name: 'name_0' });
    const response1 = await store.write('users.user1', {
      name: 'name_test',
    });
    expect(response1).toEqual({ name: 'name_test' });
  });

  test.todo('scenario 2');
});