import Graffy from '@graffy/core';
import { jest } from '@jest/globals';

/**
 * Keep a concrete promise return shape so JS type-checking doesn't infer
 * jest.fn() as (...args: never[]) => never.
 *
 * @type {(() => Promise<{ json: () => Promise<any[]> }>) & {
 *  mock: { calls: any[][] },
 *  mockResolvedValueOnce: (value: any) => any,
 *  mockReset: () => void
 * }}
 */
const mockQuery = jest.fn(() =>
  Promise.resolve({
    json: async () => [],
  }),
);
const mockClient = {
  query: mockQuery,
};

jest.unstable_mockModule('@clickhouse/client', () => ({
  createClient: () => mockClient,
}));

const { clickhouse } = await import('../../index.js');

function getSqlFromCall(call) {
  const [args] = call;
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
            _sign: 'Int8',
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
            _sign: 'Int8',
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
            _sign: 'Int8',
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
                _sign: 'Int8',
              },
            },
          },
        },
      }),
    );
  });

  afterEach(() => {
    mockQuery.mockReset();
  });

  test('id_lookup', async () => {
    mockQuery.mockResolvedValueOnce({
      json: async () => [
        {
          id: 'm1',
          updatedAt: 100,
          data: '{"subject":"Hello"}',
          _sign: 1,
        },
      ],
    });

    const result = await store.read('gmailMessage.m1', {
      data: { subject: true },
    });

    expect(result).toEqual({ data: { subject: 'Hello' } });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(getSqlFromCall(mockQuery.mock.calls[0])).toContain(
      "WHERE `_sign` = 1 AND `id` IN ('m1')",
    );
  });

  test('range_read_with_cts_and_nested_projection', async () => {
    mockQuery.mockResolvedValueOnce({
      json: async () => [
        {
          id: 'm2',
          updatedAt: 101,
          createdAt: 101,
          data: '{"subject":"Tracker subject","internalDate":"101"}',
          participants: '[{"address":"foo@bar.com"}]',
          _sign: 1,
        },
      ],
    });

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

    expect(Array.isArray(result)).toEqual(true);
    expect(result[0]).toMatchObject({
      id: 'm2',
      data: { subject: 'Tracker subject' },
      participants: [{ address: 'foo@bar.com' }],
    });
    expect(result[0].$key).toMatchObject({
      $order: ['id'],
      participants: { $cts: [{ address: 'foo@bar.com' }] },
    });
    expect(getSqlFromCall(mockQuery.mock.calls[0])).toContain('arrayExists');
  });

  test('aggregate_group_true_count_and_sum', async () => {
    mockQuery.mockResolvedValueOnce({
      json: async () => [
        {
          $count: 2,
          __agg_0: 10100,
        },
      ],
    });

    const result = await store.read('prospect', {
      $key: { isDeleted: false, $group: true },
      $count: true,
      $sum: { 'data.Amount': true },
    });

    expect(Array.isArray(result)).toEqual(true);
    expect(result).toHaveLength(1);
    expect(result[0].$count).toEqual(2);
    expect(result[0].$sum).toEqual({ 'data.Amount': 10100 });

    expect(getSqlFromCall(mockQuery.mock.calls[0])).toContain('count()');
    expect(getSqlFromCall(mockQuery.mock.calls[0])).toContain('sum(');
    expect(getSqlFromCall(mockQuery.mock.calls[0])).toContain(
      "JSONExtractString(ifNull(`data`, '{}'), 'Amount')",
    );
  });

  test('aggregate_group_true_range_count_and_sum', async () => {
    mockQuery.mockResolvedValueOnce({
      json: async () => [
        {
          $count: 2,
          __agg_0: 10100,
        },
      ],
    });

    const result = await store.read('prospect', {
      $key: { isDeleted: false, $group: true, $first: 1 },
      $count: true,
      $sum: { 'data.Amount': true },
    });

    expect(Array.isArray(result)).toEqual(true);
    expect(result).toHaveLength(1);
    expect(result[0].$count).toEqual(2);
    expect(result[0].$sum).toEqual({ 'data.Amount': 10100 });
  });

  test('aggregate_group_true_last_range_count_and_sum', async () => {
    mockQuery.mockResolvedValueOnce({
      json: async () => [
        {
          $count: 2,
          __agg_0: 10100,
        },
      ],
    });

    const result = await store.read('prospect', {
      $key: { isDeleted: false, $group: true, $last: 1 },
      $count: true,
      $sum: { 'data.Amount': true },
    });

    expect(Array.isArray(result)).toEqual(true);
    expect(result).toHaveLength(1);
    expect(result[0].$count).toEqual(2);
    expect(result[0].$sum).toEqual({ 'data.Amount': 10100 });
  });

  test('aggregate_grouped_card_and_avg', async () => {
    mockQuery.mockResolvedValueOnce({
      json: async () => [
        {
          __group_0: 0,
          $count: 2,
          __agg_0: 5050,
          __agg_1: 1,
        },
      ],
    });

    const result = await store.read('prospect', {
      $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
      $count: true,
      $avg: { 'data.Amount': true },
      $card: { id: true },
    });

    expect(Array.isArray(result)).toEqual(true);
    expect(result).toHaveLength(1);
    expect(result[0].$count).toEqual(2);
    expect(result[0].$avg).toEqual({ 'data.Amount': 5050 });
    expect(result[0].$card).toEqual({ id: 1 });
    expect(result[0].$key).toMatchObject({
      isDeleted: false,
      $group: ['isDeleted'],
      $cursor: [0],
    });
    expect(getSqlFromCall(mockQuery.mock.calls[0])).toContain('GROUP BY');
    expect(getSqlFromCall(mockQuery.mock.calls[0])).toContain('uniqExact');
    expect(getSqlFromCall(mockQuery.mock.calls[0])).toContain('avg(');
  });

  test('join_filter_query', async () => {
    mockQuery.mockResolvedValueOnce({
      json: async () => [
        {
          id: 'u1',
          updatedAt: 111,
          name: 'Alice',
          email: 'a',
          _sign: 1,
        },
      ],
    });

    const result = await store.read('users', {
      $key: { posts: { title: { $ire: 'foo' } }, $all: true },
      name: true,
    });

    expect(Array.isArray(result)).toEqual(true);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      $key: { posts: { title: { $ire: 'foo' } }, $cursor: ['u1'] },
      name: 'Alice',
    });
    expect(getSqlFromCall(mockQuery.mock.calls[0])).toContain(
      'IN (SELECT `authorId` FROM `default`.`posts` FINAL',
    );
  });
});
