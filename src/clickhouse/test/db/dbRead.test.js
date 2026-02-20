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
});
