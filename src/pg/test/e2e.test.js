import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import Graffy from '@graffy/core';
import { keyref, page, ref } from '@graffy/testing';
import { v4 as uuid } from 'uuid';
import { pg } from '../index.js';
import {
  getPool,
  resetTables,
  setupPgServer,
  teardownPgServer,
} from './setup.js';

const uuidV4Regex =
  /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

before(async () => {
  await setupPgServer();
});

after(async () => {
  await teardownPgServer();
});

describe('pg_e2e', () => {
  let store;

  beforeEach(async () => {
    await resetTables();
    store = new Graffy();
    store.use(
      'users',
      pg({
        table: 'users',
        idCol: 'id',
        verCol: 'version',
        joins: {
          posts: {
            table: 'posts',
            refCol: 'authorId',
            verCol: 'version',
          },
        },
        connection: getPool(),
      }),
    );
    store.use(
      'prospect',
      pg({
        table: 'prospect',
        idCol: 'id',
        verCol: 'version',
        connection: getPool(),
      }),
    );
    store.use(
      'posts',
      pg({
        table: 'posts',
        idCol: 'id',
        verCol: 'version',
        connection: getPool(),
      }),
    );
  });

  test('scenario_1', { timeout: 30000 }, async () => {
    // First, upsert Alice user (it should do an insert)
    const res1 = await store.write(['users', { email: 'alice@acme.co' }], {
      name: 'Alice',
      settings: { foo: 10 },
      $put: true,
    });

    assert.ok(res1 !== null && typeof res1 === 'object');
    assert.ok(Array.isArray(res1.$ref));
    assert.match(String(res1.$ref[1]), uuidV4Regex);

    const id1 = res1.$ref[1];

    // Second, read "all users with email addresses"
    // from the database, and verify the list.
    const res2 = await store.read(['users'], {
      $key: { $first: 10, email: { $not: null } },
      id: true,
      name: true,
      email: true,
      settings: { foo: true },
    });

    const exp2 = page({ email: { $not: null } }, null, [
      keyref({ $cursor: [id1], email: { $not: null } }, ['users', id1], {
        id: id1,
        name: 'Alice',
        email: 'alice@acme.co',
        settings: { foo: 10 },
      }),
    ]);
    assert.deepStrictEqual(res2, exp2);
    assert.deepStrictEqual(res2[0].$ref, exp2[0].$ref);

    // Third, upsert the same person again.
    const res3 = await store.write(['users', { email: 'alice@acme.co' }], {
      name: 'Alicia',
      settings: { bar: 5 },
      $put: true,
    });

    assert.ok(res3 !== null && typeof res3 === 'object');
    assert.deepStrictEqual(res3.$key, { email: 'alice@acme.co' });

    // Fourth, put a user Alan using a client-generated ID
    const id2 = uuid();
    const res4 = await store.write(['users', id2], {
      name: 'alan',
      email: 'alan@acme.co',
      settings: { bar: 3, baz: { x: 4, y: 5 } },
      $put: true,
    });

    assert.deepStrictEqual(res4.id, id2);
    assert.deepStrictEqual(res4.name, 'alan');
    assert.deepStrictEqual(res4.email, 'alan@acme.co');
    assert.deepStrictEqual(res4.settings, { bar: 3, baz: { x: 4, y: 5 } });
    assert.ok(typeof res4.version === 'number');

    // Fifth, get all users with names starting with "al" (case insensitive)
    // with case-insensitive sorting

    const res5 = await store.read(['users'], {
      $key: { $first: 10, name: { $ire: '^al' }, $order: ['name', 'id'] },
      id: true,
      name: true,
      email: true,
      settings: { foo: true, bar: true, baz: { x: true, y: true } },
    });

    const exp5 = page({ name: { $ire: '^al' }, $order: ['name', 'id'] }, null, [
      keyref(
        {
          $cursor: ['Alicia', id1],
          name: { $ire: '^al' },
          $order: ['name', 'id'],
        },
        ['users', id1],
        {
          id: id1,
          name: 'Alicia',
          email: 'alice@acme.co',
          settings: { foo: null, bar: 5, baz: { x: null, y: null } },
        },
      ),
      keyref(
        {
          $cursor: ['alan', id2],
          name: { $ire: '^al' },
          $order: ['name', 'id'],
        },
        ['users', id2],
        {
          id: id2,
          name: 'alan',
          email: 'alan@acme.co',
          settings: { foo: null, bar: 3, baz: { x: 4, y: 5 } },
        },
      ),
    ]);
    assert.deepStrictEqual(res5, exp5);

    // Sixth, update Alan to Alain using email address

    const res6 = await store.write(['users'], {
      $key: { email: 'alan@acme.co' },
      name: 'alain',
      settings: { foo: 7, baz: { x: null, y: 8 } },
    });

    assert.ok(Array.isArray(res6));
    assert.strictEqual(res6[0].$key, id2);
    assert.strictEqual(res6[0].id, id2);
    assert.strictEqual(res6[0].name, 'alain');
    assert.strictEqual(res6[0].email, 'alan@acme.co');
    assert.deepStrictEqual(res6[0].settings, { foo: 7, bar: 3, baz: { y: 8 } });
    assert.ok(typeof res6[0].version === 'number');

    // Seventh, get all users with names starting with "al" (case sensitive)

    const res7 = await store.read(['users'], {
      $key: { $first: 10, name: { $re: '^al' }, $order: ['name', 'id'] },
      id: true,
      name: true,
      email: true,
    });

    const exp7 = page({ name: { $re: '^al' }, $order: ['name', 'id'] }, null, [
      keyref(
        {
          $cursor: ['alain', id2],
          name: { $re: '^al' },
          $order: ['name', 'id'],
        },
        ['users', id2],
        {
          id: id2,
          name: 'alain',
          email: 'alan@acme.co',
        },
      ),
    ]);
    assert.deepStrictEqual(res7, exp7);
  });

  test('json_with_array', { timeout: 30000 }, async () => {
    await store.write('users', [
      {
        $key: uuid(),
        $put: true,
        name: 'A',
        email: 'a',
        settings: { foo: [1, 2, 3] },
      },
      {
        $key: uuid(),
        $put: true,
        name: 'B',
        email: 'b',
        settings: { foo: [3], bar: [4] },
      },
      {
        $key: uuid(),
        $put: true,
        name: 'C',
        email: 'c',
        settings: { bar: [5, 6] },
      },
      { $key: uuid(), $put: true, name: 'D', email: 'd' },
    ]);

    // Verify all items

    const res1 = await store.read(['users'], {
      $key: { $order: ['email'], $all: true },
      name: true,
      email: true,
      settings: true,
    });
    // Check key properties without the $ref since we can't use expect.any(Array)
    assert.ok(Array.isArray(res1));
    assert.strictEqual(res1.length, 4);
    assert.strictEqual(res1[0].name, 'A');
    assert.strictEqual(res1[1].name, 'B');
    assert.strictEqual(res1[2].name, 'C');
    assert.strictEqual(res1[3].name, 'D');

    // 2. Anything in array

    const res2 = await store.read('users', {
      $key: { settings: { $cts: { foo: [] } }, $order: ['email'], $all: true },
      email: true,
    });

    assert.ok(Array.isArray(res2));
    assert.strictEqual(res2.length, 2);
    assert.ok(['a', 'b'].includes(res2[0].email));
    assert.ok(['a', 'b'].includes(res2[1].email));

    // 3. Specific value in array

    const res3 = await store.read('users', {
      $key: { settings: { $cts: { bar: [4] } }, $order: ['email'], $all: true },
      email: true,
    });

    assert.ok(Array.isArray(res3));
    assert.strictEqual(res3.length, 1);
    assert.strictEqual(res3[0].email, 'b');
  });

  test('pass_through', { timeout: 30000 }, async () => {
    const uid = uuid();
    const pid = uuid();
    const res1 = await store.write({
      users: { [uid]: { name: 'Alice', $put: true } },
      posts: { [pid]: { title: 'A story', authorId: uid, $put: true } },
    });

    assert.strictEqual(res1.users[uid].id, uid);
    assert.strictEqual(res1.users[uid].name, 'Alice');
    assert.strictEqual(res1.users[uid].email, null);
    assert.strictEqual(res1.users[uid].settings, null);
    assert.ok(typeof res1.users[uid].version === 'number');
    assert.strictEqual(res1.posts[pid].id, pid);
    assert.strictEqual(res1.posts[pid].title, 'A story');
    assert.strictEqual(res1.posts[pid].authorId, uid);
    assert.ok(typeof res1.posts[pid].version === 'number');

    const res2 = await store.read({
      users: { [uid]: { name: true } },
      posts: { [pid]: { title: true } },
    });

    const exp2 = {
      users: { [uid]: { name: 'Alice' } },
      posts: { [pid]: { title: 'A story' } },
    };

    assert.deepStrictEqual(res2, exp2);
  });

  test('dot_operator', { timeout: 30000 }, async () => {
    const uid = uuid();
    await store.write({
      users: {
        [uid]: { name: 'Alice', settings: { foo: 'f', bar: 9 }, $put: true },
      },
    });

    const res1 = await store.read(['users'], {
      $key: { 'settings.foo': 'f' },
      name: true,
    });

    const exp1 = [ref(['users', uid], { name: 'Alice' })];
    assert.deepStrictEqual(res1, exp1);

    const res2 = await store.read(['users'], {
      $key: { 'settings.bar': 9, $all: true },
      name: true,
    });

    const exp2 = page({ 'settings.bar': 9 }, null, [
      keyref({ 'settings.bar': 9, $cursor: [uid] }, ['users', uid], {
        name: 'Alice',
      }),
    ]);
    assert.deepStrictEqual(res2, exp2);
  });

  test('delete', { timeout: 30000 }, async () => {
    const uid = uuid();
    const res1 = await store.write(['users', uid], {
      name: 'Alice',
      $put: true,
    });

    assert.strictEqual(res1.id, uid);
    assert.strictEqual(res1.name, 'Alice');
    assert.strictEqual(res1.email, null);
    assert.strictEqual(res1.settings, null);
    assert.ok(typeof res1.version === 'number');

    const res2 = await store.write(['users', uid], null);

    assert.strictEqual(res2, null);
  });

  describe('order', () => {
    beforeEach(async () => {
      await store.write('users', [
        { $key: uuid(), $put: true, name: 'A', email: 'a', settings: { x: 3 } },
        { $key: uuid(), $put: true, name: 'B', email: 'b', settings: { x: 5 } },
        { $key: uuid(), $put: true, name: 'C', email: 'c', settings: { x: 4 } },
      ]);
    });

    test('asc', { timeout: 30000 }, async () => {
      const res1 = await store.read('users', {
        $key: { $order: ['settings.x'], $all: true },
        name: true,
      });

      assert.ok(Array.isArray(res1));
      assert.strictEqual(res1.length, 3);
      assert.strictEqual(res1[0].name, 'A');
      assert.strictEqual(res1[1].name, 'C');
      assert.strictEqual(res1[2].name, 'B');
    });

    test('desc', { timeout: 30000 }, async () => {
      const res1 = await store.read('users', {
        $key: { $order: ['!settings.x'], $all: true },
        name: true,
      });

      assert.ok(Array.isArray(res1));
      assert.strictEqual(res1.length, 3);
      assert.strictEqual(res1[0].name, 'B');
      assert.strictEqual(res1[1].name, 'C');
      assert.strictEqual(res1[2].name, 'A');
    });
  });

  describe('aggregations', () => {
    beforeEach(async () => {
      await store.write('users', [
        {
          $key: uuid(),
          $put: true,
          name: 'A',
          email: 'a',
          settings: { foo: [1, 2, 3] },
        },
        {
          $key: uuid(),
          $put: true,
          name: 'B',
          email: 'b',
          settings: { foo: [3], bar: [4] },
        },
        {
          $key: uuid(),
          $put: true,
          name: 'C',
          email: 'c',
          settings: { bar: [5, 6] },
        },
        {
          $key: uuid(),
          $put: true,
          name: 'C',
          email: 'c2',
        },
      ]);
      await store.write('prospect', [
        {
          $key: uuid(),
          $put: true,
          data: { Amount: 10 },
          isDeleted: true,
        },
        {
          $key: uuid(),
          $put: true,
          data: { Amount: 100 },
          isDeleted: false,
        },
        {
          $key: uuid(),
          $put: true,
          data: { Amount: 1000 },
          isDeleted: true,
        },
        {
          $key: uuid(),
          $put: true,
          data: { Amount: 10000 },
          isDeleted: false,
        },
      ]);
    });

    test('count', { timeout: 30000 }, async () => {
      const res1 = await store.read('users', {
        $key: { name: { $not: null }, $group: true },
        $count: true,
      });

      assert.strictEqual(res1[0].$count, 4);
    });

    test('card', { timeout: 30000 }, async () => {
      const res1 = await store.read('users', {
        $key: { $group: true },
        $card: { name: true },
      });

      assert.strictEqual(res1[0].$card.name, 3);
    });

    test('sum', { timeout: 30000 }, async () => {
      const res1 = await store.read('users', {
        $key: { $group: true },
        $sum: { 'settings.foo.0': true },
      });

      assert.strictEqual(res1[0].$sum['settings.foo.0'], 4);
    });

    test('grouped_card', { timeout: 30000 }, async () => {
      const res1 = await store.read('users', {
        $key: { $group: ['name'], $all: true },
        $card: { email: true },
      });

      const exp1 = page({ $group: ['name'], $all: true }, null, [
        { $card: { email: 1 }, $key: { $group: ['name'], $cursor: ['A'] } },
        { $card: { email: 1 }, $key: { $group: ['name'], $cursor: ['B'] } },
        { $card: { email: 2 }, $key: { $group: ['name'], $cursor: ['C'] } },
      ]);

      assert.deepStrictEqual(res1, exp1);
    });

    test('group_count_sum', { timeout: 30000 }, async () => {
      const res1 = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      assert.strictEqual(res1[0].$count, 2);
      assert.strictEqual(res1[0].$sum['data.Amount'], 10100);
    });

    test('group_count_avg', { timeout: 30000 }, async () => {
      const res1 = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $avg: { 'data.Amount': true },
      });

      assert.strictEqual(res1[0].$count, 2);
      assert.strictEqual(res1[0].$avg['data.Amount'], 5050);
    });

    test('group_count_max', { timeout: 30000 }, async () => {
      const res1 = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $max: { 'data.Amount': true },
      });

      assert.strictEqual(res1[0].$count, 2);
      assert.strictEqual(res1[0].$max['data.Amount'], 10000);
    });

    test('group_count_min', { timeout: 30000 }, async () => {
      const res1 = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $min: { 'data.Amount': true },
      });

      assert.strictEqual(res1[0].$count, 2);
      assert.strictEqual(res1[0].$min['data.Amount'], 100);
    });

    test('group_true_filter', { timeout: 30000 }, async () => {
      const res1 = await store.read('prospect', {
        $key: { isDeleted: false, $group: true },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      assert.strictEqual(res1[0].$count, 2);
      assert.strictEqual(res1[0].$sum['data.Amount'], 10100);
    });

    test('group_true_range', { timeout: 30000 }, async () => {
      const res1 = await store.read('prospect', {
        $key: { isDeleted: false, $group: true, $first: 1 },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      assert.strictEqual(res1[0].$count, 2);
      assert.strictEqual(res1[0].$sum['data.Amount'], 10100);
    });

    test('group_all', { timeout: 30000 }, async () => {
      const res1 = await store.read('prospect', {
        $key: { $group: ['isDeleted'], $all: true },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      const map = {};
      for (const prospect of res1) {
        map[prospect.$sum['data.Amount']] = true;
      }

      assert.strictEqual(res1.length, 2);
      assert.strictEqual(map[10100], true);
      assert.strictEqual(map[1010], true);
    });
  });

  describe('cube', () => {
    beforeEach(async () => {
      await store.write('prospect', [
        {
          $key: uuid(),
          $put: true,
          data: { Amount: 10 },
          quantities: [0, 1, 2],
          isDeleted: true,
        },
      ]);
    });

    test('simple_cube', { timeout: 30000 }, async () => {
      const res1 = await store.read('prospect', {
        $key: { $all: true },
        quantities: true,
      });

      assert.deepStrictEqual(res1[0].quantities, [0, 1, 2]);
    });
  });

  test('without_transaction', { timeout: 30000 }, async () => {
    const id = uuid();

    try {
      await store.write({
        users: { $key: id, $put: true, name: 'A', email: 'a' },
        posts: { $key: 'nevermind', title: 'Fail' },
      });
    } catch (_) {
      /* Do nothing. */
    }

    const res = await store.read(['users', id], { name: true });
    assert.deepStrictEqual(res, { name: 'A' });
  });

  test('with_transaction', { timeout: 30000 }, async () => {
    const id = uuid();
    const pgClient = await getPool().connect();
    await pgClient.query('BEGIN');

    try {
      await store.write(
        {
          users: { $key: id, $put: true, name: 'A', email: 'a' },
          posts: { $key: 'nevermind', title: 'Fail' },
        },
        { pgClient },
      );
      await pgClient.query('COMMIT');
    } catch (_) {
      await pgClient.query('ROLLBACK');
    }

    await pgClient.release();

    const res = await store.read(['users', id], { name: true });
    assert.deepStrictEqual(res, { name: null });
  });

  test('complex_types', { timeout: 30000 }, async () => {
    const pid1 = uuid();
    const pid2 = uuid();
    const res1 = await store.write('posts', {
      [pid1]: {
        title: 'Post One',
        commenters: ['alice', 'bob', 'charlie'],
        scores: [5, 10, 0],
        $put: true,
      },
      [pid2]: {
        title: 'Post Two',
        commenters: ['alice', 'debra'],
        scores: [-1, 3, 0],
        $put: true,
      },
    });

    assert.strictEqual(res1[pid1].id, pid1);
    assert.strictEqual(res1[pid1].title, 'Post One');
    assert.deepStrictEqual(res1[pid1].commenters, ['alice', 'bob', 'charlie']);
    assert.deepStrictEqual(res1[pid1].scores, [5, 10, 0]);
    assert.ok(typeof res1[pid1].version === 'number');
    assert.strictEqual(res1[pid2].id, pid2);
    assert.strictEqual(res1[pid2].title, 'Post Two');

    // Case 2: Cube query

    const res2 = await store.read('posts', {
      $key: {
        $all: true,
        scores: {
          $ctd: [
            [0, null, 0],
            [null, 20, 0],
          ],
        },
      },
      title: true,
    });

    const exp2 = page(
      {
        scores: {
          $ctd: [
            [0, null, 0],
            [null, 20, 0],
          ],
        },
      },
      null,
      [
        keyref(
          {
            scores: {
              $ctd: [
                [0, null, 0],
                [null, 20, 0],
              ],
            },
            $cursor: [pid1],
          },
          ['posts', pid1],
          { title: 'Post One' },
        ),
      ],
    );

    assert.deepStrictEqual(res2, exp2);

    // Case 3: Array query

    const res3 = await store.read('posts', {
      $key: { $all: true, commenters: { $cts: ['bob'] } },
      title: true,
    });

    const exp3 = page({ commenters: { $cts: ['bob'] } }, null, [
      keyref(
        { commenters: { $cts: ['bob'] }, $cursor: [pid1] },
        ['posts', pid1],
        { title: 'Post One' },
      ),
    ]);

    assert.deepStrictEqual(res3, exp3);

    // Case 4: Order by cube component

    const res4 = await store.read('posts', {
      $key: { $first: 1, $order: ['!scores.1'] },
      title: true,
    });

    const exp4 = page({ $order: ['!scores.1'], $until: [-5] }, 1, [
      keyref({ $order: ['!scores.1'], $cursor: [-5] }, ['posts', pid1], {
        title: 'Post One',
      }),
    ]);

    assert.deepStrictEqual(res4, exp4);
  });

  describe('no_filter', () => {
    test('one_result', { timeout: 30000 }, async () => {
      await store.write('users', [
        {
          $key: uuid(),
          name: 'A',
          email: 'a@foo',
          $put: true,
        },
      ]);
      const res = await store.read('users', {
        $key: { $all: true },
        name: true,
      });
      assert.ok(Array.isArray(res));
      assert.strictEqual(res.length, 1);
      assert.strictEqual(res[0].name, 'A');
    });
  });

  describe('json_lookup_and_operators', () => {
    beforeEach(async () => {
      await store.write('users', [
        {
          $key: uuid(),
          $put: true,
          name: 'A',
          email: 'a',
          settings: { str: 'hello', num: 10 },
        },
        {
          $key: uuid(),
          $put: true,
          name: 'B',
          email: 'b',
          settings: { str: 'world', num: 15 },
        },
      ]);
    });

    async function doTest(filter, results) {
      const res = await store.read('users', {
        $key: { ...filter, $all: true },
        name: true,
      });
      assert.ok(Array.isArray(res));
      assert.strictEqual(res.length, results.length);
      for (let i = 0; i < results.length; i++) {
        assert.strictEqual(res[i].name, results[i]);
      }
    }

    test('str_eq', { timeout: 30000 }, async () =>
      doTest({ 'settings.str': 'hello' }, ['A']),
    );
    test('str_neq', { timeout: 30000 }, async () =>
      doTest({ 'settings.str': { $not: 'world' } }, ['A']),
    );
    test('str_in', { timeout: 30000 }, async () =>
      doTest({ 'settings.str': ['hello', 'bonjour'] }, ['A']),
    );
    test('str_nin', { timeout: 30000 }, async () =>
      doTest({ 'settings.str': { $not: ['hello', 'bonjour'] } }, ['B']),
    );
    test('str_re', { timeout: 30000 }, async () =>
      doTest({ 'settings.str': { $re: 'h.*' } }, ['A']),
    );
    test('str_ire', { timeout: 30000 }, async () =>
      doTest({ 'settings.str': { $ire: 'H.*' } }, ['A']),
    );

    test('num_eq', { timeout: 30000 }, async () =>
      doTest({ 'settings.num': 10 }, ['A']),
    );
    test('num_neq', { timeout: 30000 }, async () =>
      doTest({ 'settings.num': { $not: 10 } }, ['B']),
    );
    test('num_in', { timeout: 30000 }, async () =>
      doTest({ 'settings.num': [9, 10, 11] }, ['A']),
    );
    test('num_nin', { timeout: 30000 }, async () =>
      doTest({ 'settings.num': { $not: [14, 15, 16] } }, ['A']),
    );
    test('num_lt', { timeout: 30000 }, async () =>
      doTest({ 'settings.num': { $lt: 12 } }, ['A']),
    );
    test('num_gt', { timeout: 30000 }, async () =>
      doTest({ 'settings.num': { $gt: 13 } }, ['B']),
    );
  });

  test('update_single_child_null', { timeout: 30000 }, async () => {
    const id = uuid();
    await store.write('users', [
      {
        $key: id,
        $put: true,
        name: 'A',
        settings: { foo: { bar: 33 } },
      },
    ]);

    await store.write(['users', id], {
      settings: { foo: { bar: null }, baz: { $put: true, bar: null } },
    });

    const pgClient = await getPool().connect();
    const res = (
      await pgClient.query(`SELECT "settings" from "users" where id = '${id}'`)
    ).rows[0];
    pgClient.release();

    assert.deepStrictEqual(res, { settings: null });
  });

  test('update_set_val_null', { timeout: 30000 }, async () => {
    const id = uuid();
    await store.write('users', [
      {
        $key: id,
        $put: true,
        name: 'A',
        settings: { foo: { bar: 33 } },
      },
    ]);

    await store.write(['users', id], {
      settings: { foo: { bar: null }, baz: { $val: null } },
    });

    const pgClient = await getPool().connect();
    const res = (
      await pgClient.query(`SELECT "settings" from "users" where id = '${id}'`)
    ).rows[0];
    pgClient.release();

    assert.deepStrictEqual(res, { settings: { baz: { $val: null } } });
  });

  describe('join', () => {
    beforeEach(async () => {
      const uidA = uuid();
      const uidB = uuid();
      await store.write({
        users: {
          [uidA]: { $put: true, name: 'Alice', email: 'a' },
          [uidB]: { $put: true, name: 'Bob', email: 'b' },
        },
        posts: {
          [uuid()]: {
            title: 'Extra Foo',
            authorId: uidA,
            $put: true,
          },
          [uuid()]: {
            title: 'Extra bar',
            authorId: uidB,
            $put: true,
          },
        },
      });
    });

    test('equals', { timeout: 30000 }, async () => {
      const res = await store.read('users', {
        $key: { posts: { title: 'Extra bar' } },
        name: true,
      });
      assert.deepStrictEqual(res, [{ name: 'Bob' }]);
    });

    test('regex', { timeout: 30000 }, async () => {
      const res = await store.read('users', {
        $key: { posts: { title: { $ire: 'foo' } } },
        name: true,
      });
      assert.deepStrictEqual(res, [{ name: 'Alice' }]);
    });

    test('combined_narrowing', { timeout: 30000 }, async () => {
      const res = await store.read('users', {
        $key: { email: 'a', posts: { title: { $ire: 'Extra' } } },
        name: true,
      });
      assert.deepStrictEqual(res, [{ name: 'Alice' }]);
    });

    test('combined_negative_range', { timeout: 30000 }, async () => {
      const res = await store.read('users', {
        $key: { email: 'a', posts: { title: 'Extra bar' }, $all: true },
        name: true,
      });
      assert.deepStrictEqual(
        res,
        page(
          { email: 'a', posts: { title: 'Extra bar' }, $all: true },
          null,
          [],
        ),
      );
    });
  });
  describe('json key existence operators', () => {
    const uidA = uuid();
    const uidB = uuid();
    beforeEach(async () => {
      await store.write(['users', uidA], {
        name: 'alice',
        email: 'alice@acme.co',
        settings: { foo: 3 },
        $put: true,
      });
      await store.write(['users', uidB], {
        name: 'bob',
        email: 'bob@acme.co',
        settings: { bar: 5 },
        $put: true,
      });
    });

    test('keycts', { timeout: 30000 }, async () => {
      const res1 = await store.read('users', {
        $key: {
          settings: {
            $keycts: ['foo', 'bar'],
          },
          $order: ['name'],
          $all: true,
        },
        name: true,
      });
      assert.ok(Array.isArray(res1));
      assert.strictEqual(res1.length, 2);
      const names1 = res1.map((r) => r.name).sort();
      assert.deepStrictEqual(names1, ['alice', 'bob']);

      const res2 = await store.read('users', {
        $key: {
          settings: {
            $keycts: ['foo'],
          },
        },
        name: true,
      });
      assert.deepStrictEqual(res2, [{ name: 'alice' }]);
    });
    test('keyctd', { timeout: 30000 }, async () => {
      const res1 = await store.read('users', {
        $key: {
          settings: {
            $keyctd: ['foo', 'bar'],
          },
          $order: ['name'],
          $all: true,
        },
        name: true,
      });
      const expected = page(
        {
          settings: {
            $keyctd: ['foo', 'bar'],
          },
          $order: ['name'],
        },
        null,
        [],
      );
      assert.deepStrictEqual(res1, expected);
      const res2 = await store.read('users', {
        $key: {
          settings: {
            $keyctd: ['foo'],
          },
        },
        name: true,
      });
      assert.deepStrictEqual(res2, [{ name: 'alice' }]);
    });
  });

  describe('inspection', () => {
    beforeEach(async () => {
      await store.write(['users', uuid()], {
        name: 'alice',
        email: 'alice@acme.co',
        settings: { foo: 3 },
        $put: true,
      });
      await store.write(['users', uuid()], {
        name: 'bob',
        email: 'bob@acme.co',
        settings: { bar: 5 },
        $put: true,
      });
    });
    test('explain', { timeout: 30000 }, async () => {
      const result = await store.read(['users'], {
        $key: { $explain: { name: 'alice' } },
        sql: true,
        plan: true,
      });
      assert.strictEqual(
        result[0].sql,
        'SELECT\n' +
          '  *,\n' +
          '  \'{"name":"alice"}\'::jsonb AS "$key",\n' +
          '  (\n' +
          '    EXTRACT(\n' +
          '      epoch\n' +
          '      FROM\n' +
          '        CURRENT_TIMESTAMP\n' +
          '    ) * (1000)::numeric\n' +
          '  ) AS "$ver",\n' +
          '  array[\'users\'::text, "id"]::text[] AS "$ref"\n' +
          'FROM\n' +
          '  "users"\n' +
          'WHERE\n' +
          '  "id" = (\n' +
          '    SELECT\n' +
          '      "id"\n' +
          '    FROM\n' +
          '      "users"\n' +
          '    WHERE\n' +
          '      "name" = \'alice\'\n' +
          '    LIMIT\n' +
          '      2\n' +
          '  )',
      );
      assert.ok(
        result[0].plan.Plan !== null && typeof result[0].plan.Plan === 'object',
      );
      assert.strictEqual(result[0].plan.Planning, undefined);
      assert.strictEqual(result[0].plan['Planning Time'], undefined);
      assert.strictEqual(result[0].plan['Execution Time'], undefined);
    });

    test('explain analyze', { timeout: 30000 }, async () => {
      const result = await store.read(['users'], {
        $key: { $explain: { name: 'alice' }, analyze: true },
        sql: true,
        plan: true,
      });
      assert.ok(
        result[0].plan.Plan !== null && typeof result[0].plan.Plan === 'object',
      );
      assert.ok(
        result[0].plan.Planning !== null &&
          typeof result[0].plan.Planning === 'object',
      );
      assert.ok(typeof result[0].plan['Planning Time'] === 'number');
      assert.ok(typeof result[0].plan['Execution Time'] === 'number');
    });
  });
});
