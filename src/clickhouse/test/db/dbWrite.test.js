import Graffy from '@graffy/core';
import { jest } from '@jest/globals';
import clickhouse from '../../index.js';

function setupStore(connection, options = {}) {
  const store = new Graffy();
  store.use(
    'users',
    clickhouse({
      ...options,
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

    expect(query).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({
      table: '`default`.`users`',
      format: 'JSONEachRow',
      values: [
        {
          id: 'u1',
          name: 'Alice',
          email: 'alice@acme.co',
          settings: '{"foo":10}',
        },
      ],
    });
  });

  test('put_by_id_quotes_hyphenated_database_name', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const insert = jest.fn().mockResolvedValue(undefined);
    const store = setupStore({ query, insert }, { database: 'lego-dev-b' });

    await store.write(['users', 'u1'], {
      name: 'Alice',
      $put: true,
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({
      table: '`lego-dev-b`.`users`',
    });
  });

  test('put_by_id_preserves_provided_ver_col', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const insert = jest.fn().mockResolvedValue(undefined);
    const store = setupStore({ query, insert });

    await store.write(['users', 'u1'], {
      updatedAt: 123,
      name: 'Alice',
      $put: true,
    });

    expect(query).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({
      values: [
        {
          id: 'u1',
          updatedAt: 123,
          name: 'Alice',
        },
      ],
    });
  });

  test('put_by_filter_is_unsupported', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const insert = jest.fn().mockResolvedValue(undefined);
    const store = setupStore({ query, insert });

    await expect(
      store.write('users', {
        $key: { email: 'alice@acme.co' },
        name: 'Alicia',
        email: 'alice@acme.co',
        settings: { bar: 5 },
        $put: true,
      }),
    ).rejects.toThrow('clickhouse_write.object_arg_unsupported');
    expect(query).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  test('write_without_put_is_unsupported', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const insert = jest.fn().mockResolvedValue(undefined);
    const store = setupStore({ query, insert });

    await expect(
      store.write(['users', 'u1'], {
        name: 'Alice',
      }),
    ).rejects.toThrow('clickhouse_write.put_required');
    expect(query).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
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
