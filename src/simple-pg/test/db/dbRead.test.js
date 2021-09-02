import Graffy from '@graffy/core';
import sql from 'sql-template-tag';
import graffyPg from '../../index.js';
import expectSql from '../expectSql';
// import { populate } from './setup.js';

// import debug from 'debug';
import pool from '../../pool.js';

jest.mock('../../pool', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    __esModule: true,
    default: {
      select: jest.fn(),
      connect: jest.fn(() => mockClient),
      mockClient,
    },
  };

  return mockPool;
});

// const log = debug('graffy:pg:test');

describe('postgres', () => {
  let store;

  beforeEach(async () => {
    jest.useFakeTimers();

    store = new Graffy();
    store.use(
      'user',
      graffyPg({
        table: 'user',
        id: 'id',
        version: 'version',
      }),
    );
  });

  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
    pool.select.mockReset();
  });

  test('id_lookup', async () => {
    const now = Date.now();
    pool.select.mockReturnValueOnce([
      { id: 'foo', name: 'Alice', version: now },
    ]);
    const result = await store.read('user.foo', {
      name: true,
      version: true,
    });
    expect(pool.select).toBeCalled();
    expectSql(
      pool.select.mock.calls[0][0],
      sql`
      SELECT * 
      FROM "user" WHERE "id" IN (${'foo'})
    `,
    );
    expect(result).toEqual({
      name: 'Alice',
      version: now,
    });
  });
});
