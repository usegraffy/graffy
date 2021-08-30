import Graffy from '@graffy/core';
import sql from 'sql-template-tag';
import graffyPg from '../../index.js';
// import { populate } from './setup.js';
import expectSql from '../../sql/expectSql.js';

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
      insert: jest.fn(),
      connect: jest.fn(() => mockClient),
      mockClient,
      loadSchema: (_) => undefined,
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
    pool.insert.mockReset();
  });

  test('patch_by_id', async () => {
    pool.insert.mockReturnValueOnce({
      rowCount: 1,
    });
    const result = await store.write('user.foo', {
      name: 'Alice',
    });
    expect(pool.insert).toBeCalled();
    expectSql(
      pool.insert.mock.calls[0][0],
      sql`
      UPDATE "user" SET
        "data" = "data" || ${{ name: 'Alice' }},
        "version" = cast ( extract ( epoch from now ( ) ) as integer )
      WHERE "id" = ${'foo'}
      RETURNING
        ("data" || jsonb_build_object('id', "id", 'createdAt', "createdAt") ||
        jsonb_build_object( '$key', "id", '$ver', cast ( extract ( epoch from now ( ) ) as integer ) ))
    `,
    );
    expect(result).toEqual({
      name: 'Alice',
    });
  });
});
