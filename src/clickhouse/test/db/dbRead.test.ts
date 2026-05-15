import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import Graffy from '@graffy/core';

/**
 * Keep a concrete promise return shape so JS type-checking doesn't infer
 * mock.fn() as (...args: never[]) => never.
 *
 * @type {(() => Promise<{ json: () => Promise<any[]> }>) & {
 *  mock: import('node:test').MockFunctionContext<any, any>
 * }}
 */
const defaultImpl = () =>
  Promise.resolve({
    json: async () => [],
  });

const mockQuery = mock.fn(defaultImpl);
const mockClient = {
  query: mockQuery,
};

await mock.module('@clickhouse/client', {
  exports: {
    createClient: () => mockClient,
  },
});

const { clickhouse } = await import('../../index.ts');

function getSqlFromCall(call) {
  const [args] = call.arguments;
  return args.query;
}

describe('clickhouse_db_read', () => {
  let store;

  beforeEach(() => {
    store = new Graffy();
    store.use(
      'gmailMessage',
      clickhouse({
        table: 'gmailMessage',
        idCol: 'id',
        verCol: 'updatedAt',
        schema: {
          types: {
            id: 'String',
            updatedAt: 'Int64',
            createdAt: 'Int64',
            isDeleted: 'UInt8',
            participants: 'Nullable(String)',
            data: 'Nullable(String)',
          },
        },
      }),
    );

    store.use(
      'prospect',
      clickhouse({
        table: 'prospect',
        idCol: 'id',
        verCol: 'updatedAt',
        schema: {
          types: {
            id: 'String',
            updatedAt: 'Int64',
            createdAt: 'Int64',
            isDeleted: 'UInt8',
            data: 'Nullable(String)',
          },
        },
      }),
    );

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
            createdAt: 'Int64',
            name: 'String',
            email: 'String',
          },
        },
        joins: {
          posts: {
            table: 'posts',
            refCol: 'authorId',
            idCol: 'id',
            verCol: 'updatedAt',
            schema: {
              types: {
                id: 'String',
                updatedAt: 'Int64',
                authorId: 'String',
                title: 'String',
              },
            },
          },
        },
      }),
    );
  });

  afterEach(() => {
    mockQuery.mock.resetCalls();
    mockQuery.mock.mockImplementation(defaultImpl);
  });

  test('id_lookup', async () => {
    mockQuery.mock.mockImplementationOnce(async () => ({
      json: async () => [
        {
          id: 'm1',
          updatedAt: 100,
          data: '{"subject":"Hello"}',
        },
      ],
    }));

    const result = await store.read('gmailMessage.m1', {
      data: { subject: true },
    });

    assert.deepStrictEqual(result, { data: { subject: 'Hello' } });
    assert.strictEqual(mockQuery.mock.callCount(), 1);
    assert.ok(
      getSqlFromCall(mockQuery.mock.calls[0]).includes("WHERE `id` IN ('m1')"),
    );
  });

  test('range_read_with_cts_and_nested_projection', async () => {
    mockQuery.mock.mockImplementationOnce(async () => ({
      json: async () => [
        {
          id: 'm2',
          updatedAt: 101,
          createdAt: 101,
          data: '{"subject":"Tracker subject","internalDate":"101"}',
          participants: '[{"address":"foo@bar.com"}]',
        },
      ],
    }));

    const result = await store.read('gmailMessage', {
      $key: {
        $order: ['id'],
        $all: true,
        isDeleted: false,
        participants: {
          $cts: [{ address: 'foo@bar.com' }],
        },
      },
      id: true,
      data: {
        subject: true,
      },
      participants: true,
    });

    assert.ok(Array.isArray(result));
    for (const [k, v] of Object.entries({
      id: 'm2',
      data: { subject: 'Tracker subject' },
      participants: [{ address: 'foo@bar.com' }],
    })) {
      assert.deepStrictEqual(result[0][k], v);
    }
    for (const [k, v] of Object.entries({
      $order: ['id'],
      participants: { $cts: [{ address: 'foo@bar.com' }] },
    })) {
      assert.deepStrictEqual(result[0].$key[k], v);
    }
    assert.ok(getSqlFromCall(mockQuery.mock.calls[0]).includes('arrayExists'));
  });

  test('aggregate_group_true_count_and_sum', async () => {
    mockQuery.mock.mockImplementationOnce(async () => ({
      json: async () => [
        {
          $count: 2,
          __agg_0: 10100,
        },
      ],
    }));

    const result = await store.read('prospect', {
      $key: { isDeleted: false, $group: true },
      $count: true,
      $sum: { 'data.Amount': true },
    });

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].$count, 2);
    assert.deepStrictEqual(result[0].$sum, { 'data.Amount': 10100 });

    assert.ok(getSqlFromCall(mockQuery.mock.calls[0]).includes('count()'));
    assert.ok(getSqlFromCall(mockQuery.mock.calls[0]).includes('sum('));
    assert.ok(
      getSqlFromCall(mockQuery.mock.calls[0]).includes(
        "JSONExtractString(ifNull(`data`, '{}'), 'Amount')",
      ),
    );
  });

  test('aggregate_group_true_range_count_and_sum', async () => {
    mockQuery.mock.mockImplementationOnce(async () => ({
      json: async () => [
        {
          $count: 2,
          __agg_0: 10100,
        },
      ],
    }));

    const result = await store.read('prospect', {
      $key: { isDeleted: false, $group: true, $first: 1 },
      $count: true,
      $sum: { 'data.Amount': true },
    });

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].$count, 2);
    assert.deepStrictEqual(result[0].$sum, { 'data.Amount': 10100 });
  });

  test('aggregate_group_true_last_range_count_and_sum', async () => {
    mockQuery.mock.mockImplementationOnce(async () => ({
      json: async () => [
        {
          $count: 2,
          __agg_0: 10100,
        },
      ],
    }));

    const result = await store.read('prospect', {
      $key: { isDeleted: false, $group: true, $last: 1 },
      $count: true,
      $sum: { 'data.Amount': true },
    });

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].$count, 2);
    assert.deepStrictEqual(result[0].$sum, { 'data.Amount': 10100 });
  });

  test('aggregate_grouped_card_and_avg', async () => {
    mockQuery.mock.mockImplementationOnce(async () => ({
      json: async () => [
        {
          __group_0: 0,
          $count: 2,
          __agg_0: 5050,
          __agg_1: 1,
        },
      ],
    }));

    const result = await store.read('prospect', {
      $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
      $count: true,
      $avg: { 'data.Amount': true },
      $card: { id: true },
    });

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].$count, 2);
    assert.deepStrictEqual(result[0].$avg, { 'data.Amount': 5050 });
    assert.deepStrictEqual(result[0].$card, { id: 1 });
    for (const [k, v] of Object.entries({
      isDeleted: false,
      $group: ['isDeleted'],
      $cursor: [0],
    })) {
      assert.deepStrictEqual(result[0].$key[k], v);
    }
    assert.ok(getSqlFromCall(mockQuery.mock.calls[0]).includes('GROUP BY'));
    assert.ok(getSqlFromCall(mockQuery.mock.calls[0]).includes('uniqExact'));
    assert.ok(getSqlFromCall(mockQuery.mock.calls[0]).includes('avg('));
  });

  test('join_filter_query', async () => {
    mockQuery.mock.mockImplementationOnce(async () => ({
      json: async () => [
        {
          id: 'u1',
          updatedAt: 111,
          name: 'Alice',
          email: 'a',
        },
      ],
    }));

    const result = await store.read('users', {
      $key: { posts: { title: { $ire: 'foo' } }, $all: true },
      name: true,
    });

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 1);
    for (const [k, v] of Object.entries({
      $key: { posts: { title: { $ire: 'foo' } }, $cursor: ['u1'] },
      name: 'Alice',
    })) {
      assert.deepStrictEqual(result[0][k], v);
    }
    assert.ok(
      getSqlFromCall(mockQuery.mock.calls[0]).includes(
        'IN (SELECT `authorId` FROM `default`.`posts`',
      ),
    );
  });
});
