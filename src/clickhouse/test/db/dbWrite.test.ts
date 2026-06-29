import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';
import Graffy from '@graffy/core';
import clickhouse from '../../index.ts';

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
    const query = mock.fn(async () => []);
    const insert = mock.fn(async () => undefined);
    const store = setupStore({ query, insert });

    await store.write(['users', 'u1'], {
      name: 'Alice',
      email: 'alice@acme.co',
      settings: { foo: 10 },
      $put: true,
    });

    assert.strictEqual(query.mock.callCount(), 0);
    assert.strictEqual(insert.mock.callCount(), 1);
    for (const [k, v] of Object.entries({
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
    })) {
      assert.deepStrictEqual(
        (insert.mock.calls as any[])[0].arguments[0][k],
        v,
      );
    }
  });

  test('multiple_puts_are_inserted_as_one_batch', async () => {
    const query = mock.fn(async () => []);
    const insert = mock.fn(async () => undefined);
    const store = setupStore({ query, insert });

    await store.write('users', [
      {
        $key: 'u1',
        name: 'Alice',
        settings: { foo: 10 },
        $put: true,
      },
      {
        $key: 'u2',
        name: 'Bob',
        email: 'bob@acme.co',
        $put: true,
      },
    ]);

    assert.strictEqual(query.mock.callCount(), 0);
    assert.strictEqual(insert.mock.callCount(), 1);
    assert.deepStrictEqual((insert.mock.calls as any[])[0].arguments[0], {
      table: '`default`.`users`',
      values: [
        {
          id: 'u1',
          name: 'Alice',
          settings: '{"foo":10}',
        },
        {
          id: 'u2',
          name: 'Bob',
          email: 'bob@acme.co',
        },
      ],
      format: 'JSONEachRow',
    });
  });

  test('put_by_id_quotes_hyphenated_database_name', async () => {
    const query = mock.fn(async () => []);
    const insert = mock.fn(async () => undefined);
    const store = setupStore({ query, insert }, { database: 'lego-dev-b' });

    await store.write(['users', 'u1'], {
      name: 'Alice',
      $put: true,
    });

    assert.strictEqual(insert.mock.callCount(), 1);
    assert.strictEqual(
      (insert.mock.calls as any[])[0].arguments[0].table,
      '`lego-dev-b`.`users`',
    );
  });

  test('put_by_id_preserves_provided_ver_col', async () => {
    const query = mock.fn(async () => []);
    const insert = mock.fn(async () => undefined);
    const store = setupStore({ query, insert });

    await store.write(['users', 'u1'], {
      updatedAt: 123,
      name: 'Alice',
      $put: true,
    });

    assert.strictEqual(query.mock.callCount(), 0);
    assert.strictEqual(insert.mock.callCount(), 1);
    for (const [k, v] of Object.entries({
      values: [
        {
          id: 'u1',
          updatedAt: 123,
          name: 'Alice',
        },
      ],
    })) {
      assert.deepStrictEqual(
        (insert.mock.calls as any[])[0].arguments[0][k],
        v,
      );
    }
  });

  test('put_by_filter_is_unsupported', async () => {
    const query = mock.fn(async () => []);
    const insert = mock.fn(async () => undefined);
    const store = setupStore({ query, insert });

    await assert.rejects(
      () =>
        store.write('users', {
          $key: { email: 'alice@acme.co' },
          name: 'Alicia',
          email: 'alice@acme.co',
          settings: { bar: 5 },
          $put: true,
        }),
      /clickhouse_write.object_arg_unsupported/,
    );
    assert.strictEqual(query.mock.callCount(), 0);
    assert.strictEqual(insert.mock.callCount(), 0);
  });

  test('write_without_put_is_unsupported', async () => {
    const query = mock.fn(async () => []);
    const insert = mock.fn(async () => undefined);
    const store = setupStore({ query, insert });

    await assert.rejects(
      () =>
        store.write(['users', 'u1'], {
          name: 'Alice',
        }),
      /clickhouse_write.put_required/,
    );
    assert.strictEqual(query.mock.callCount(), 0);
    assert.strictEqual(insert.mock.callCount(), 0);
  });

  test('delete_by_id_is_unsupported', async () => {
    const query = mock.fn(async () => []);
    const insert = mock.fn(async () => undefined);
    const store = setupStore({ query, insert });

    await assert.rejects(
      () => store.write(['users', 'u1'], null),
      /clickhouse_write.delete_unsupported/,
    );
    assert.strictEqual(query.mock.callCount(), 0);
    assert.strictEqual(insert.mock.callCount(), 0);
  });
});
