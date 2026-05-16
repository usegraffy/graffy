import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import Graffy from '@graffy/core';
import { clickhouse } from '../index.ts';
import {
  getClient,
  getTestDatabase,
  resetTables,
  seedPosts,
  seedProspects,
  seedUsers,
  setupClickhouseServer,
  teardownClickhouseServer,
} from './setup.ts';

const asNum = (value) => (typeof value === 'number' ? value : Number(value));

function getRows(result) {
  return Array.isArray(result) ? result : [result];
}

describe('clickhouse_e2e', () => {
  let store;

  before(async () => {
    await setupClickhouseServer();
  });

  after(async () => {
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
    test('put_by_id_blindly_inserts_and_db_sets_default_ver_col', {
      timeout: 120000,
    }, async () => {
      const created = await store.write(['users', 'u1'], {
        name: 'Alice',
        email: 'alice@acme.co',
        settings: { foo: 10 },
        $put: true,
      });

      for (const [k, v] of Object.entries({
        id: 'u1',
        name: 'Alice',
        email: 'alice@acme.co',
        settings: { foo: 10 },
      })) {
        assert.deepStrictEqual(created[k], v);
      }
      assert.strictEqual(created.updatedAt, undefined);

      const afterCreate = await store.read('users.u1', {
        updatedAt: true,
        name: true,
        email: true,
        settings: true,
      });
      for (const [k, v] of Object.entries({
        name: 'Alice',
        email: 'alice@acme.co',
        settings: { foo: 10 },
      })) {
        assert.deepStrictEqual(afterCreate[k], v);
      }
      assert.ok(asNum(afterCreate.updatedAt) > 0);
    });

    test('write_without_put_is_unsupported', { timeout: 120000 }, async () => {
      await assert.rejects(
        () =>
          store.write(['users', 'u1'], {
            name: 'Alice',
          }),
        /clickhouse_write.put_required/,
      );
    });

    test('delete_is_unsupported', { timeout: 120000 }, async () => {
      await assert.rejects(
        () => store.write(['users', 'u1'], null),
        /clickhouse_write.delete_unsupported/,
      );
    });

    test('filter_put_is_unsupported', { timeout: 120000 }, async () => {
      await assert.rejects(
        () =>
          store.write(['users', { email: 'new@acme.co' }], {
            name: 'New User',
            settings: { foo: 1 },
            $put: true,
          }),
        /clickhouse_write.object_arg_unsupported/,
      );
    });
  });

  test('dot_path_filter_on_native_map', { timeout: 120000 }, async () => {
    const database = getTestDatabase();
    const connection = getClient();

    await connection.command({
      query: `DROP TABLE IF EXISTS ${database}.workLog`,
    });

    await connection.command({
      query: `
        CREATE TABLE ${database}.workLog (
          id String,
          updatedAt Int64 DEFAULT toUnixTimestamp64Milli(now64(3)),
          tenantId LowCardinality(String),
          recordIds Map(LowCardinality(String), String),
          data Nullable(String)
        )
        ENGINE = MergeTree
        PRIMARY KEY (tenantId, updatedAt)
        ORDER BY (tenantId, updatedAt, id)
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

    assert.strictEqual(result.length, 1);
    for (const [k, v] of Object.entries({
      id: 'w1',
      tenantId: 't1',
      recordIds: {
        gmailMessageId: 'gm-1',
        sfTaskId: 'sf-1',
      },
    })) {
      assert.deepStrictEqual(result[0][k], v);
    }
  });

  test('native_json_with_int64_version_round_trip', {
    timeout: 120000,
  }, async () => {
    const database = getTestDatabase();
    const connection = getClient();

    await connection.command({
      query: `DROP TABLE IF EXISTS ${database}.workLogJson`,
    });

    await connection.command({
      query: `
        CREATE TABLE ${database}.workLogJson (
          id String,
          time Int64 DEFAULT toUnixTimestamp64Milli(now64(3)),
          tenantId LowCardinality(String),
          code LowCardinality(String),
          recordIds Map(LowCardinality(String), String),
          data JSON
        )
        ENGINE = MergeTree
        PRIMARY KEY (tenantId, code, time)
        ORDER BY (tenantId, code, time, id)
      `,
      clickhouse_settings: {
        allow_experimental_json_type: 1,
      },
    });

    store.use(
      'workLogJson',
      clickhouse({
        database,
        table: 'workLogJson',
        idCol: 'id',
        connection,
      }),
    );

    await store.write(['workLogJson', 'w1'], {
      tenantId: 't1',
      code: 'sf_sync_read',
      recordIds: {
        googleIntegrationId: 'gi-1',
        sfSyncJobId: 'job-1',
      },
      data: {
        stage: 'initial',
        nested: {
          source: 'pg',
        },
      },
      $put: true,
    });

    await store.write(['workLogJson', 'w2'], {
      tenantId: 't1',
      code: 'sf_sync_read',
      recordIds: {
        googleIntegrationId: 'gi-1',
        sfSyncJobId: 'job-1',
      },
      data: {
        stage: 'written_to_clickhouse',
        nested: {
          source: 'lego',
          status: 'ok',
        },
      },
      $put: true,
    });

    const byId = await store.read('workLogJson.w1', {
      time: true,
      tenantId: true,
      code: true,
      recordIds: true,
      data: true,
    });

    for (const [k, v] of Object.entries({
      tenantId: 't1',
      code: 'sf_sync_read',
      recordIds: {
        googleIntegrationId: 'gi-1',
        sfSyncJobId: 'job-1',
      },
      data: {
        stage: 'initial',
        nested: {
          source: 'pg',
        },
      },
    })) {
      assert.deepStrictEqual(byId[k], v);
    }
    assert.ok(asNum(byId.time) > 0);

    const filtered = await store.read('workLogJson', {
      $key: {
        'recordIds.sfSyncJobId': 'job-1',
        $order: ['id'],
        $all: true,
      },
      id: true,
      code: true,
      data: true,
    });

    assert.strictEqual(filtered.length, 2);
    assert.strictEqual(filtered[0].id, 'w1');
    assert.strictEqual(filtered[0].code, 'sf_sync_read');
    assert.strictEqual(filtered[0].data.stage, 'initial');
    assert.strictEqual(filtered[1].id, 'w2');
    assert.strictEqual(filtered[1].code, 'sf_sync_read');
    assert.strictEqual(filtered[1].data.stage, 'written_to_clickhouse');
  });

  test('id_lookup_with_nested_projection', { timeout: 120000 }, async () => {
    await seedUsers([
      {
        id: 'u1',
        updatedAt: 1,
        name: 'Alice',
        settings: { foo: 10, bar: 5 },
      },
    ]);

    const result = await store.read('users.u1', {
      name: true,
      settings: { foo: true },
    });

    assert.deepStrictEqual(result, {
      name: 'Alice',
      settings: { foo: 10 },
    });
  });

  test('order_by_json_path_asc_and_desc', { timeout: 120000 }, async () => {
    await seedUsers([
      {
        id: 'u1',
        updatedAt: 1,
        name: 'A',
        email: 'a',
        settings: { x: 3 },
      },
      {
        id: 'u2',
        updatedAt: 2,
        name: 'B',
        email: 'b',
        settings: { x: 5 },
      },
      {
        id: 'u3',
        updatedAt: 3,
        name: 'C',
        email: 'c',
        settings: { x: 4 },
      },
    ]);

    const asc = await store.read('users', {
      $key: { $order: ['settings.x'], $all: true },
      name: true,
    });

    assert.deepStrictEqual(
      getRows(asc).map(({ name }) => name),
      ['A', 'C', 'B'],
    );
    assert.deepStrictEqual(
      getRows(asc).map((row) => asNum(row.$key.$cursor[0])),
      [3, 4, 5],
    );

    const desc = await store.read('users', {
      $key: { $order: ['!settings.x'], $all: true },
      name: true,
    });

    assert.deepStrictEqual(
      getRows(desc).map(({ name }) => name),
      ['B', 'C', 'A'],
    );
    assert.deepStrictEqual(
      getRows(desc).map((row) => asNum(row.$key.$cursor[0])),
      [-5, -4, -3],
    );
  });

  test('json_array_contains_and_projection', { timeout: 120000 }, async () => {
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

    assert.deepStrictEqual(
      getRows(allUsers).map(({ email }) => email),
      ['a', 'b', 'c'],
    );
    assert.deepStrictEqual(getRows(allUsers)[0].settings, {
      foo: [1, 2, 3],
    });

    const containsFoo = await store.read('users', {
      $key: {
        settings: { $cts: { foo: [1, 2, 3] } },
        $order: ['email'],
        $all: true,
      },
      email: true,
    });

    assert.deepStrictEqual(
      getRows(containsFoo).map(({ email }) => email),
      ['a'],
    );

    const containsBar4 = await store.read('users', {
      $key: {
        settings: { $cts: { bar: [4] } },
        $order: ['email'],
        $all: true,
      },
      email: true,
    });

    assert.deepStrictEqual(
      getRows(containsBar4).map(({ email }) => email),
      ['b'],
    );
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
      assert.deepStrictEqual(
        getRows(result).map((row) => row.name),
        names,
      );
    }

    test('string_operators', { timeout: 120000 }, async () => {
      await assertFilterNames({ 'settings.str': 'hello' }, ['A']);
      await assertFilterNames({ 'settings.str': { $not: 'world' } }, ['A']);
      await assertFilterNames({ 'settings.str': ['hello', 'bonjour'] }, ['A']);
      await assertFilterNames({ 'settings.str': { $re: 'h.*' } }, ['A']);
      await assertFilterNames({ 'settings.str': { $ire: 'H.*' } }, ['A']);
    });

    test('number_operators', { timeout: 120000 }, async () => {
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
        {
          id: 'u1',
          updatedAt: 1,
          name: 'A',
          email: 'a',
          settings: { num: 1 },
        },
        {
          id: 'u2',
          updatedAt: 2,
          name: 'B',
          email: 'b',
          settings: { num: 3 },
        },
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

    test('count_card_sum', { timeout: 120000 }, async () => {
      const countRes = await store.read('users', {
        $key: { name: { $not: null }, $group: true },
        $count: true,
      });
      assert.strictEqual(asNum(countRes[0].$count), 4);

      const cardRes = await store.read('users', {
        $key: { $group: true },
        $card: { name: true },
      });
      assert.strictEqual(asNum(cardRes[0].$card.name), 3);

      const sumRes = await store.read('users', {
        $key: { $group: true },
        $sum: { 'settings.num': true },
      });
      assert.strictEqual(asNum(sumRes[0].$sum['settings.num']), 4);
    });

    test('grouped_card', { timeout: 120000 }, async () => {
      const result = await store.read('users', {
        $key: { $group: ['name'], $all: true },
        $card: { email: true },
      });

      assert.deepStrictEqual(
        getRows(result).map((row) => row.$key.$cursor[0]),
        ['A', 'B', 'C'],
      );
      assert.deepStrictEqual(
        getRows(result).map((row) => asNum(row.$card.email)),
        [1, 1, 2],
      );
    });

    test('group_count_sum_avg_max_min', { timeout: 120000 }, async () => {
      const sumRes = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $sum: { 'data.Amount': true },
      });
      assert.strictEqual(asNum(sumRes[0].$count), 2);
      assert.strictEqual(asNum(sumRes[0].$sum['data.Amount']), 10100);

      const avgRes = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $avg: { 'data.Amount': true },
      });
      assert.strictEqual(asNum(avgRes[0].$count), 2);
      assert.strictEqual(asNum(avgRes[0].$avg['data.Amount']), 5050);

      const maxRes = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $max: { 'data.Amount': true },
      });
      assert.strictEqual(asNum(maxRes[0].$count), 2);
      assert.strictEqual(asNum(maxRes[0].$max['data.Amount']), 10000);

      const minRes = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $min: { 'data.Amount': true },
      });
      assert.strictEqual(asNum(minRes[0].$count), 2);
      assert.strictEqual(asNum(minRes[0].$min['data.Amount']), 100);
    });

    test('group_true_and_group_all', { timeout: 120000 }, async () => {
      const grouped = await store.read('prospect', {
        $key: { isDeleted: false, $group: true },
        $count: true,
        $sum: { 'data.Amount': true },
      });
      assert.strictEqual(asNum(grouped[0].$count), 2);
      assert.strictEqual(asNum(grouped[0].$sum['data.Amount']), 10100);

      const groupedWithRange = await store.read('prospect', {
        $key: { isDeleted: false, $group: true, $first: 1 },
        $count: true,
        $sum: { 'data.Amount': true },
      });
      assert.strictEqual(asNum(groupedWithRange[0].$count), 2);
      assert.strictEqual(asNum(groupedWithRange[0].$sum['data.Amount']), 10100);

      const allGroups = await store.read('prospect', {
        $key: { $group: ['isDeleted'], $all: true },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      assert.strictEqual(allGroups.length, 2);
      const byAmount = Object.fromEntries(
        allGroups.map((row) => [
          asNum(row.$sum['data.Amount']),
          asNum(row.$count),
        ]),
      );
      assert.strictEqual(byAmount[10100], 2);
      assert.strictEqual(byAmount[1010], 2);
    });

    test('all_ops_with_negative_and_missing_values', {
      timeout: 120000,
    }, async () => {
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

      assert.strictEqual(asNum(result[0].$count), 5);
      assert.strictEqual(asNum(result[0].$sum['data.Amount']), 10095);
      assert.strictEqual(asNum(result[0].$avg['data.Amount']), 2019);
      assert.strictEqual(asNum(result[0].$max['data.Amount']), 10000);
      assert.strictEqual(asNum(result[0].$min['data.Amount']), -5);
      assert.strictEqual(asNum(result[0].$card.id), 5);
    });

    test('group_pagination_with_after_cursor', {
      timeout: 120000,
    }, async () => {
      const page1 = await store.read('prospect', {
        $key: { $group: ['isDeleted'], $first: 1 },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      assert.strictEqual(page1.length, 1);

      const page2 = await store.read('prospect', {
        $key: {
          $group: ['isDeleted'],
          $first: 1,
          $after: page1[0].$key.$cursor,
        },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      assert.strictEqual(page2.length, 1);

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

      assert.deepStrictEqual(byDeleted[0], { count: 2, sum: 10100 });
      assert.deepStrictEqual(byDeleted[1], { count: 2, sum: 1010 });
    });

    test('group_true_last_range_preserves_aggregate_row', {
      timeout: 120000,
    }, async () => {
      const result = await store.read('prospect', {
        $key: { isDeleted: false, $group: true, $last: 1 },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      assert.strictEqual(result.length, 1);
      assert.strictEqual(asNum(result[0].$count), 2);
      assert.strictEqual(asNum(result[0].$sum['data.Amount']), 10100);
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

    test('equals_regex_and_narrowing', { timeout: 120000 }, async () => {
      const equalsRes = await store.read('users', {
        $key: { posts: { title: 'Extra bar' }, $all: true, $order: ['name'] },
        name: true,
      });
      assert.deepStrictEqual(
        getRows(equalsRes).map((row) => row.name),
        ['Bob'],
      );

      const regexRes = await store.read('users', {
        $key: {
          posts: { title: { $ire: 'foo' } },
          $all: true,
          $order: ['name'],
        },
        name: true,
      });
      assert.deepStrictEqual(
        getRows(regexRes).map((row) => row.name),
        ['Alice'],
      );

      const combinedRes = await store.read('users', {
        $key: {
          email: 'a',
          posts: { title: { $ire: 'Extra' } },
          $all: true,
          $order: ['name'],
        },
        name: true,
      });
      assert.deepStrictEqual(
        getRows(combinedRes).map((row) => row.name),
        ['Alice'],
      );

      const negativeRangeRes = await store.read('users', {
        $key: {
          email: 'a',
          posts: { title: 'Extra bar' },
          $all: true,
          $order: ['name'],
        },
        name: true,
      });
      assert.strictEqual(getRows(negativeRangeRes).length, 0);
    });

    test('explicit_and_on_join_applies_to_same_join_row', {
      timeout: 120000,
    }, async () => {
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
      assert.strictEqual(getRows(crossRowAndRes).length, 0);

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
      assert.deepStrictEqual(
        getRows(sameRowAndRes).map((row) => row.name),
        ['Carol'],
      );
    });
  });
});
