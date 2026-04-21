import Graffy from '@graffy/core';
import { jest } from '@jest/globals';
import { clickhouse } from '../index.js';
import {
  getClient,
  getTestDatabase,
  resetTables,
  seedPosts,
  seedProspects,
  seedUsers,
  setupClickhouseServer,
  teardownClickhouseServer,
} from './setup.js';

jest.setTimeout(120000);

const asNum = (value) => (typeof value === 'number' ? value : Number(value));

function getRows(result) {
  return Array.isArray(result) ? result : [result];
}

describe('clickhouse_e2e', () => {
  let store;

  beforeAll(async () => {
    await setupClickhouseServer();
  });

  afterAll(async () => {
    await teardownClickhouseServer();
  });

  beforeEach(async () => {
    await resetTables();
    const database = getTestDatabase();
    const connection = getClient();

    store = new Graffy();

    store.use(
      'users',
      clickhouse({
        database,
        table: 'users',
        idCol: 'id',
        verCol: 'updatedAt',
        joins: {
          posts: {
            database,
            table: 'posts',
            refCol: 'authorId',
            idCol: 'id',
            verCol: 'updatedAt',
          },
        },
        connection,
      }),
    );

    store.use(
      'posts',
      clickhouse({
        database,
        table: 'posts',
        idCol: 'id',
        verCol: 'updatedAt',
        connection,
      }),
    );

    store.use(
      'prospect',
      clickhouse({
        database,
        table: 'prospect',
        idCol: 'id',
        verCol: 'updatedAt',
        connection,
      }),
    );
  });

  describe('write', () => {
    test('put_patch_and_delete', async () => {
      const created = await store.write(['users', 'u1'], {
        name: 'Alice',
        email: 'alice@acme.co',
        settings: { foo: 10 },
        $put: true,
      });

      expect(created).toMatchObject({
        id: 'u1',
        name: 'Alice',
        email: 'alice@acme.co',
        settings: { foo: 10 },
        _sign: 1,
      });
      expect(asNum(created.updatedAt)).toBeGreaterThan(0);

      const afterCreate = await store.read('users.u1', {
        name: true,
        email: true,
        settings: true,
      });
      expect(afterCreate).toEqual({
        name: 'Alice',
        email: 'alice@acme.co',
        settings: { foo: 10 },
      });

      await store.write('users', {
        $key: { email: 'alice@acme.co' },
        name: 'Alicia',
        settings: { bar: 5 },
      });

      const afterPatch = await store.read('users.u1', {
        name: true,
        email: true,
        settings: true,
      });
      expect(afterPatch).toEqual({
        name: 'Alicia',
        email: 'alice@acme.co',
        settings: { foo: 10, bar: 5 },
      });

      await store.write(['users', 'u1'], {
        settings: { foo: null },
      });

      const afterJsonPatch = await store.read('users.u1', {
        settings: true,
      });
      expect(afterJsonPatch).toEqual({
        settings: { bar: 5 },
      });

      await store.write(['users', 'u1'], null);

      const afterDelete = await store.read('users.u1', {
        name: true,
        email: true,
      });
      expect(afterDelete).toEqual({
        name: null,
        email: null,
      });
    });

    test('filter_put_inserts_new_row', async () => {
      await store.write(['users', { email: 'new@acme.co' }], {
        name: 'New User',
        settings: { foo: 1 },
        $put: true,
      });

      const rows = await store.read('users', {
        $key: {
          email: 'new@acme.co',
          $order: ['id'],
          $all: true,
        },
        id: true,
        name: true,
        email: true,
        settings: true,
      });

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        name: 'New User',
        email: 'new@acme.co',
        settings: { foo: 1 },
      });
      expect(typeof rows[0].id).toEqual('string');
    });
  });

  test('dot_path_filter_on_native_map', async () => {
    const database = getTestDatabase();
    const connection = getClient();

    await connection.command({
      query: `DROP TABLE IF EXISTS ${database}.workLog`,
    });

    await connection.command({
      query: `
        CREATE TABLE ${database}.workLog (
          id String,
          updatedAt Int64,
          tenantId LowCardinality(String),
          recordIds Map(LowCardinality(String), String),
          data Nullable(String),
          _sign Int8 DEFAULT 1
        )
        ENGINE = ReplacingMergeTree(updatedAt)
        ORDER BY id
      `,
    });

    store.use(
      'workLog',
      clickhouse({
        database,
        table: 'workLog',
        idCol: 'id',
        verCol: 'updatedAt',
        connection,
      }),
    );

    await store.write(['workLog', 'w1'], {
      tenantId: 't1',
      recordIds: {
        gmailMessageId: 'gm-1',
        sfTaskId: 'sf-1',
      },
      data: {
        code: 'kept',
      },
      $put: true,
    });

    await store.write(['workLog', 'w2'], {
      tenantId: 't1',
      recordIds: {
        gmailMessageId: 'gm-2',
        sfTaskId: 'sf-2',
      },
      data: {
        code: 'dropped',
      },
      $put: true,
    });

    const result = await store.read('workLog', {
      $key: {
        'recordIds.gmailMessageId': 'gm-1',
        $order: ['id'],
        $all: true,
      },
      id: true,
      recordIds: true,
      tenantId: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'w1',
      tenantId: 't1',
      recordIds: {
        gmailMessageId: 'gm-1',
        sfTaskId: 'sf-1',
      },
    });
  });

  test('id_lookup_with_nested_projection', async () => {
    await seedUsers([
      { id: 'u1', updatedAt: 1, name: 'Alice', settings: { foo: 10, bar: 5 } },
    ]);

    const result = await store.read('users.u1', {
      name: true,
      settings: { foo: true },
    });

    expect(result).toEqual({
      name: 'Alice',
      settings: { foo: 10 },
    });
  });

  test('order_by_json_path_asc_and_desc', async () => {
    await seedUsers([
      { id: 'u1', updatedAt: 1, name: 'A', email: 'a', settings: { x: 3 } },
      { id: 'u2', updatedAt: 2, name: 'B', email: 'b', settings: { x: 5 } },
      { id: 'u3', updatedAt: 3, name: 'C', email: 'c', settings: { x: 4 } },
    ]);

    const asc = await store.read('users', {
      $key: { $order: ['settings.x'], $all: true },
      name: true,
    });

    expect(getRows(asc).map(({ name }) => name)).toEqual(['A', 'C', 'B']);
    expect(getRows(asc).map((row) => asNum(row.$key.$cursor[0]))).toEqual([
      3, 4, 5,
    ]);

    const desc = await store.read('users', {
      $key: { $order: ['!settings.x'], $all: true },
      name: true,
    });

    expect(getRows(desc).map(({ name }) => name)).toEqual(['B', 'C', 'A']);
    expect(getRows(desc).map((row) => asNum(row.$key.$cursor[0]))).toEqual([
      -5, -4, -3,
    ]);
  });

  test('json_array_contains_and_projection', async () => {
    await seedUsers([
      {
        id: 'u1',
        updatedAt: 1,
        name: 'A',
        email: 'a',
        settings: { foo: [1, 2, 3] },
      },
      {
        id: 'u2',
        updatedAt: 2,
        name: 'B',
        email: 'b',
        settings: { foo: [3], bar: [4] },
      },
      {
        id: 'u3',
        updatedAt: 3,
        name: 'C',
        email: 'c',
        settings: { bar: [5, 6] },
      },
    ]);

    const allUsers = await store.read('users', {
      $key: { $order: ['email'], $all: true },
      email: true,
      settings: true,
    });

    expect(getRows(allUsers).map(({ email }) => email)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(getRows(allUsers)[0].settings).toEqual({ foo: [1, 2, 3] });

    const containsFoo = await store.read('users', {
      $key: {
        settings: { $cts: { foo: [1, 2, 3] } },
        $order: ['email'],
        $all: true,
      },
      email: true,
    });

    expect(getRows(containsFoo).map(({ email }) => email)).toEqual(['a']);

    const containsBar4 = await store.read('users', {
      $key: { settings: { $cts: { bar: [4] } }, $order: ['email'], $all: true },
      email: true,
    });

    expect(getRows(containsBar4).map(({ email }) => email)).toEqual(['b']);
  });

  describe('json_lookup_and_operators', () => {
    beforeEach(async () => {
      await seedUsers([
        {
          id: 'u1',
          updatedAt: 1,
          name: 'A',
          email: 'a',
          settings: { str: 'hello', num: 10 },
        },
        {
          id: 'u2',
          updatedAt: 2,
          name: 'B',
          email: 'b',
          settings: { str: 'world', num: 15 },
        },
      ]);
    });

    async function assertFilterNames(filter, names) {
      const result = await store.read('users', {
        $key: { ...filter, $order: ['name'], $all: true },
        name: true,
      });
      expect(getRows(result).map((row) => row.name)).toEqual(names);
    }

    test('string_operators', async () => {
      await assertFilterNames({ 'settings.str': 'hello' }, ['A']);
      await assertFilterNames({ 'settings.str': { $not: 'world' } }, ['A']);
      await assertFilterNames({ 'settings.str': ['hello', 'bonjour'] }, ['A']);
      await assertFilterNames({ 'settings.str': { $re: 'h.*' } }, ['A']);
      await assertFilterNames({ 'settings.str': { $ire: 'H.*' } }, ['A']);
    });

    test('number_operators', async () => {
      await assertFilterNames({ 'settings.num': 10 }, ['A']);
      await assertFilterNames({ 'settings.num': { $not: 10 } }, ['B']);
      await assertFilterNames({ 'settings.num': [9, 10, 11] }, ['A']);
      await assertFilterNames({ 'settings.num': { $lt: 12 } }, ['A']);
      await assertFilterNames({ 'settings.num': { $gt: 13 } }, ['B']);
    });
  });

  describe('aggregations', () => {
    beforeEach(async () => {
      await seedUsers([
        { id: 'u1', updatedAt: 1, name: 'A', email: 'a', settings: { num: 1 } },
        { id: 'u2', updatedAt: 2, name: 'B', email: 'b', settings: { num: 3 } },
        {
          id: 'u3',
          updatedAt: 3,
          name: 'C',
          email: 'c',
          settings: { bar: [5] },
        },
        { id: 'u4', updatedAt: 4, name: 'C', email: 'c2' },
      ]);

      await seedProspects([
        { id: 'p1', updatedAt: 1, data: { Amount: 10 }, isDeleted: true },
        { id: 'p2', updatedAt: 2, data: { Amount: 100 }, isDeleted: false },
        { id: 'p3', updatedAt: 3, data: { Amount: 1000 }, isDeleted: true },
        { id: 'p4', updatedAt: 4, data: { Amount: 10000 }, isDeleted: false },
      ]);
    });

    test('count_card_sum', async () => {
      const countRes = await store.read('users', {
        $key: { name: { $not: null }, $group: true },
        $count: true,
      });
      expect(asNum(countRes[0].$count)).toEqual(4);

      const cardRes = await store.read('users', {
        $key: { $group: true },
        $card: { name: true },
      });
      expect(asNum(cardRes[0].$card.name)).toEqual(3);

      const sumRes = await store.read('users', {
        $key: { $group: true },
        $sum: { 'settings.num': true },
      });
      expect(asNum(sumRes[0].$sum['settings.num'])).toEqual(4);
    });

    test('grouped_card', async () => {
      const result = await store.read('users', {
        $key: { $group: ['name'], $all: true },
        $card: { email: true },
      });

      expect(getRows(result).map((row) => row.$key.$cursor[0])).toEqual([
        'A',
        'B',
        'C',
      ]);
      expect(getRows(result).map((row) => asNum(row.$card.email))).toEqual([
        1, 1, 2,
      ]);
    });

    test('group_count_sum_avg_max_min', async () => {
      const sumRes = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $sum: { 'data.Amount': true },
      });
      expect(asNum(sumRes[0].$count)).toEqual(2);
      expect(asNum(sumRes[0].$sum['data.Amount'])).toEqual(10100);

      const avgRes = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $avg: { 'data.Amount': true },
      });
      expect(asNum(avgRes[0].$count)).toEqual(2);
      expect(asNum(avgRes[0].$avg['data.Amount'])).toEqual(5050);

      const maxRes = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $max: { 'data.Amount': true },
      });
      expect(asNum(maxRes[0].$count)).toEqual(2);
      expect(asNum(maxRes[0].$max['data.Amount'])).toEqual(10000);

      const minRes = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $min: { 'data.Amount': true },
      });
      expect(asNum(minRes[0].$count)).toEqual(2);
      expect(asNum(minRes[0].$min['data.Amount'])).toEqual(100);
    });

    test('group_true_and_group_all', async () => {
      const grouped = await store.read('prospect', {
        $key: { isDeleted: false, $group: true },
        $count: true,
        $sum: { 'data.Amount': true },
      });
      expect(asNum(grouped[0].$count)).toEqual(2);
      expect(asNum(grouped[0].$sum['data.Amount'])).toEqual(10100);

      const groupedWithRange = await store.read('prospect', {
        $key: { isDeleted: false, $group: true, $first: 1 },
        $count: true,
        $sum: { 'data.Amount': true },
      });
      expect(asNum(groupedWithRange[0].$count)).toEqual(2);
      expect(asNum(groupedWithRange[0].$sum['data.Amount'])).toEqual(10100);

      const allGroups = await store.read('prospect', {
        $key: { $group: ['isDeleted'], $all: true },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      expect(allGroups).toHaveLength(2);
      const byAmount = Object.fromEntries(
        allGroups.map((row) => [
          asNum(row.$sum['data.Amount']),
          asNum(row.$count),
        ]),
      );
      expect(byAmount[10100]).toEqual(2);
      expect(byAmount[1010]).toEqual(2);
    });

    test('all_ops_with_negative_and_missing_values', async () => {
      await seedProspects([
        { id: 'p5', updatedAt: 5, data: { Amount: -5 }, isDeleted: false },
        { id: 'p6', updatedAt: 6, data: {}, isDeleted: false },
        { id: 'p7', updatedAt: 7, data: { Amount: null }, isDeleted: false },
      ]);

      const result = await store.read('prospect', {
        $key: { isDeleted: false, $group: true },
        $count: true,
        $sum: { 'data.Amount': true },
        $avg: { 'data.Amount': true },
        $max: { 'data.Amount': true },
        $min: { 'data.Amount': true },
        $card: { id: true },
      });

      expect(asNum(result[0].$count)).toEqual(5);
      expect(asNum(result[0].$sum['data.Amount'])).toEqual(10095);
      expect(asNum(result[0].$avg['data.Amount'])).toEqual(2019);
      expect(asNum(result[0].$max['data.Amount'])).toEqual(10000);
      expect(asNum(result[0].$min['data.Amount'])).toEqual(-5);
      expect(asNum(result[0].$card.id)).toEqual(5);
    });

    test('group_pagination_with_after_cursor', async () => {
      const page1 = await store.read('prospect', {
        $key: { $group: ['isDeleted'], $first: 1 },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      expect(page1).toHaveLength(1);

      const page2 = await store.read('prospect', {
        $key: {
          $group: ['isDeleted'],
          $first: 1,
          $after: page1[0].$key.$cursor,
        },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      expect(page2).toHaveLength(1);

      const merged = [page1[0], page2[0]];
      const byDeleted = Object.fromEntries(
        merged.map((row) => [
          asNum(row.$key.$cursor[0]),
          {
            count: asNum(row.$count),
            sum: asNum(row.$sum['data.Amount']),
          },
        ]),
      );

      expect(byDeleted[0]).toEqual({ count: 2, sum: 10100 });
      expect(byDeleted[1]).toEqual({ count: 2, sum: 1010 });
    });

    test('group_true_last_range_preserves_aggregate_row', async () => {
      const result = await store.read('prospect', {
        $key: { isDeleted: false, $group: true, $last: 1 },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      expect(result).toHaveLength(1);
      expect(asNum(result[0].$count)).toEqual(2);
      expect(asNum(result[0].$sum['data.Amount'])).toEqual(10100);
    });
  });

  describe('join', () => {
    beforeEach(async () => {
      await seedUsers([
        { id: 'u1', updatedAt: 1, name: 'Alice', email: 'a' },
        { id: 'u2', updatedAt: 2, name: 'Bob', email: 'b' },
      ]);

      await seedPosts([
        {
          id: 'p1',
          updatedAt: 1,
          authorId: 'u1',
          title: 'Extra Foo',
          commenters: ['alice'],
        },
        {
          id: 'p2',
          updatedAt: 2,
          authorId: 'u2',
          title: 'Extra bar',
          commenters: ['bob'],
        },
      ]);
    });

    test('equals_regex_and_narrowing', async () => {
      const equalsRes = await store.read('users', {
        $key: { posts: { title: 'Extra bar' }, $all: true, $order: ['name'] },
        name: true,
      });
      expect(getRows(equalsRes).map((row) => row.name)).toEqual(['Bob']);

      const regexRes = await store.read('users', {
        $key: {
          posts: { title: { $ire: 'foo' } },
          $all: true,
          $order: ['name'],
        },
        name: true,
      });
      expect(getRows(regexRes).map((row) => row.name)).toEqual(['Alice']);

      const combinedRes = await store.read('users', {
        $key: {
          email: 'a',
          posts: { title: { $ire: 'Extra' } },
          $all: true,
          $order: ['name'],
        },
        name: true,
      });
      expect(getRows(combinedRes).map((row) => row.name)).toEqual(['Alice']);

      const negativeRangeRes = await store.read('users', {
        $key: {
          email: 'a',
          posts: { title: 'Extra bar' },
          $all: true,
          $order: ['name'],
        },
        name: true,
      });
      expect(getRows(negativeRangeRes)).toHaveLength(0);
    });

    test('explicit_and_on_join_applies_to_same_join_row', async () => {
      await seedUsers([{ id: 'u3', updatedAt: 3, name: 'Carol', email: 'c' }]);
      await seedPosts([
        {
          id: 'p3',
          updatedAt: 3,
          authorId: 'u3',
          title: 'First title',
          commenters: ['alice'],
        },
        {
          id: 'p4',
          updatedAt: 4,
          authorId: 'u3',
          title: 'Second title',
          commenters: ['bob'],
        },
      ]);

      const crossRowAndRes = await store.read('users', {
        $key: {
          posts: {
            $and: [{ title: 'First title' }, { commenters: { $cts: ['bob'] } }],
          },
          $all: true,
          $order: ['name'],
        },
        name: true,
      });
      expect(getRows(crossRowAndRes)).toHaveLength(0);

      const sameRowAndRes = await store.read('users', {
        $key: {
          posts: {
            $and: [
              { title: 'Second title' },
              { commenters: { $cts: ['bob'] } },
            ],
          },
          $all: true,
          $order: ['name'],
        },
        name: true,
      });
      expect(getRows(sameRowAndRes).map((row) => row.name)).toEqual(['Carol']);
    });
  });
});
