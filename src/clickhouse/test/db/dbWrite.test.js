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
      "WHERE `id` IN ('u1')",
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
      "WHERE `email` = 'alice@acme.co' LIMIT 2",
    );
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0].values[0]).toMatchObject({
      id: 'u1',
      name: 'Alicia',
      email: 'alice@acme.co',
      settings: '{"foo":10,"bar":5}',
    });
    expect(insert.mock.calls[0][0].values[0].updatedAt).toBeGreaterThan(100);
  });

  test('delete_by_id_is_unsupported', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const insert = jest.fn().mockResolvedValue(undefined);
    const store = setupStore({ query, insert });

    await expect(store.write(['users', 'u1'], null)).rejects.toThrow(
      'clickhouse_write.delete_unsupported',
    );
    expect(query).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
