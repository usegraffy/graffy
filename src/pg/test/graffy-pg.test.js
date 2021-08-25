import Graffy from '@graffy/core';
import pg from '../index.js';
import { populate } from './setup.js';

import debug from 'debug';
const log = debug('graffy:pg:test');
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
    store.use('user', pg());
  });

  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test.skip('scenario 1', async () => {
    const result1 = await store.read('user.user0', { i: 1 });

    expect(result1).toEqual({ i: 0 });

    const response1 = await store.write('user.user1', {
      i: 2,
    });

    expect(response1).toEqual({ i: 2 });
  });

  test.todo('scenario 2');
});
