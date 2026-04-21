import Graffy from '@graffy/core';
import { jest } from '@jest/globals';
import { clickhouse } from '../../index.js';

function setupStore(connection) {
  const store = new Graffy();
  store.use(
    'users',
    clickhouse({
      table: 'users',
      idCol: 'id',
      verCol: 'updatedAt',
      schema: {
        types: {
          id: 'String',
          updatedAt: 'Int64',
          name: 'Nullable(String)',
          email: 'Nullable(String)',
          settings: 'Nullable(String)',
          _sign: 'Int8',
        },
      },
      connection,
    }),
  );
  return store;
}

describe('clickhouse_db_write', () => {
  test('put_by_id_inserts_serialized_row', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const insert = jest.fn().mockResolvedValue(undefined);
    const store = setupStore({ query, insert });

    await store.write(['users', 'u1'], {
      name: 'Alice',
      email: 'alice@acme.co',
      settings: { foo: 10 },
      $put: true,
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0].query).toContain(
      "WHERE `_sign` = 1 AND `id` IN ('u1')",
    );
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({
      table: 'default.users',
      format: 'JSONEachRow',
      values: [
        {
          id: 'u1',
          name: 'Alice',
          email: 'alice@acme.co',
          settings: '{"foo":10}',
          _sign: 1,
          updatedAt: expect.any(Number),
        },
      ],
    });
  });

  test('patch_by_filter_merges_json_and_bumps_version', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: 'u1',
        updatedAt: 100,
        name: 'Alice',
        email: 'alice@acme.co',
        settings: '{"foo":10}',
        _sign: 1,
      },
    ]);
    const insert = jest.fn().mockResolvedValue(undefined);
    const store = setupStore({ query, insert });

    await store.write('users', {
      $key: { email: 'alice@acme.co' },
      name: 'Alicia',
      settings: { bar: 5 },
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0].query).toContain(
      "WHERE `_sign` = 1 AND `email` = 'alice@acme.co' LIMIT 2",
    );
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0].values[0]).toMatchObject({
      id: 'u1',
      name: 'Alicia',
      email: 'alice@acme.co',
      settings: '{"foo":10,"bar":5}',
      _sign: 1,
    });
    expect(insert.mock.calls[0][0].values[0].updatedAt).toBeGreaterThan(100);
  });

  test('delete_by_id_inserts_tombstone', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: 'u1',
        updatedAt: 100,
        name: 'Alice',
        email: 'alice@acme.co',
        settings: '{"foo":10}',
        _sign: 1,
      },
    ]);
    const insert = jest.fn().mockResolvedValue(undefined);
    const store = setupStore({ query, insert });

    await store.write(['users', 'u1'], null);

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0].values[0]).toMatchObject({
      id: 'u1',
      name: 'Alice',
      email: 'alice@acme.co',
      settings: '{"foo":10}',
      _sign: 0,
    });
    expect(insert.mock.calls[0][0].values[0].updatedAt).toBeGreaterThan(100);
  });
});
