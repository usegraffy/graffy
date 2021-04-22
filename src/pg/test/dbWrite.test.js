import Graffy from '@graffy/core';
import sql from 'sql-template-tag';
import graffyPg from '../index.js';
// import { populate } from './setup';
import expectSql from '../sql/expectSql.js';

import debug from 'debug';
import pool from '../pool';

jest.mock('../pool', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    __esModule: true,
    default: {
      query: jest.fn(),
      connect: jest.fn(() => mockClient),
      mockClient,
    },
  };

  return mockPool;
});

const log = debug('graffy:pg:test');

describe('postgres', () => {
  let store;

  beforeEach(async () => {
    jest.useFakeTimers();

    store = new Graffy();
    store.use(
      'user',
      graffyPg({
        table: 'users',
        columns: {
          id: { role: 'primary' },
          tags: { role: 'gin', props: ['email', 'phone'] },
          data: { role: 'default', updater: '||' },
          createdAt: { role: 'simple' },
          version: { role: 'version' },
        },
        links: { posts: { target: 'post', back: 'author' } },
      }),
    );
  });

  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
    pool.query.mockReset();
  });

  test.only('patch_by_id', async () => {
    pool.query.mockReturnValueOnce({
      rowCount: 1,
    });
    const result = await store.write('user.foo', {
      name: 'Alice',
    });
    expect(pool.query).toBeCalled();
    expectSql(
      pool.query.mock.calls[0][0],
      sql`
      UPDATE "users" SET
        "data" = "data" || ${{ name: 'Alice' }},
        "version" = now()
      WHERE "id" = ${'foo'}
      RETURNING
        ("data" || jsonb_build_object('id', "id", 'createdAt', "createdAt") ||
        jsonb_build_object( '$key', "id", '$ver', now() ))
    `,
    );
    expect(result).toEqual({
      name: 'Alice',
    });
  });
});
