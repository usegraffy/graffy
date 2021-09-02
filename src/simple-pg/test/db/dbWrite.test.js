import Graffy from '@graffy/core';
import sql from 'sql-template-tag';
import graffyPg from '../../index.js';
// import { populate } from './setup.js';
import expectSql from '../expectSql.js';

// import debug from 'debug';
import pool from '../../pool.js';
import { nowTimestamp } from '../../sql/helper.js';

jest.mock('../../pool', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    __esModule: true,
    default: {
      insert: jest.fn(),
      update: jest.fn(),
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
        table: 'users',
        id: 'id',
        version: 'version',
      }),
    );
  });

  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
    pool.update.mockReset();
    pool.insert.mockReset();
  });

  test('patch_by_id', async () => {
    const data = {
      name: 'Alice',
    };
    const id = 'foo';
    pool.update.mockReturnValueOnce({
      rowCount: 1,
    });
    const result = await store.write('user.foo', data);
    expect(pool.update).toBeCalled();

    const sqlQuery = sql`
      UPDATE "users" SET
        "name" = ${data.name},
        "version" = ${nowTimestamp}
      WHERE "id" = ${id}
      RETURNING *
    `;
    expectSql(pool.update.mock.calls[0][0], sqlQuery);
    expect(result).toEqual({
      name: 'Alice',
    });
  });

  test('with $put (insert on conflict)', async () => {
    const data = {
      name: 'Alice',
      $put: true,
    };
    const id = 'foo';
    pool.insert.mockReturnValueOnce({
      rowCount: 1,
    });
    const result = await store.write('user.foo', data);
    expect(pool.insert).toBeCalled();

    const expectedQuery = pool.insert.mock.calls[0][0];
    const version = expectedQuery.values[expectedQuery.values.length - 1];
    const sqlQuery = sql`
      INSERT INTO "users" ("id", "name", "version")
      VALUES (${id}, ${data.name}, ${version}) ON CONFLICT ("id") DO UPDATE SET
      ("name", "version") = (${data.name}, ${version})
      RETURNING *
    `;
    expectSql(pool.insert.mock.calls[0][0], sqlQuery);

    expect(result).toEqual({
      name: 'Alice',
      $put: true,
    });
  });
});
