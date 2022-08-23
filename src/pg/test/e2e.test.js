import { v4 as uuid } from 'uuid';
import Graffy from '@graffy/core';
import { put, ref, keyref } from '@graffy/testing';
import { pg } from '../index.js';
import {
  setupPgServer,
  teardownPgServer,
  resetTables,
  getPool,
} from './setup.js';

/**
 * @typedef {any[] & { $next?: any, $prev?: any, $page?: any }} GraffyRangeResult
 */

const uuidV4Regex =
  /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

jest.setTimeout(30000);

describe('pg_e2e', () => {
  let store;

  beforeAll(async () => {
    await setupPgServer();
  });

  afterAll(async () => {
    await teardownPgServer();
  });

  beforeEach(async () => {
    await resetTables();
    store = new Graffy();
    store.use(
      'users',
      pg({
        table: 'users',
        idCol: 'id',
        verCol: 'version',
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

  test('scenario_1', async () => {
    // First, upsert Alice user (it should do an insert)
    const res1 = await store.write(['users', { email: 'alice@acme.co' }], {
      name: 'Alice',
      settings: { foo: 10 },
      $put: true,
    });

    expect(res1).toEqual(
      keyref({ email: 'alice@acme.co' }, ['users', expect.any(String)]),
    );

    const id1 = res1.$ref[1];
    expect(id1).toMatch(uuidV4Regex);

    // Second, read "all users with email addresses"
    // from the database, and verify the list.
    const res2 = await store.read(['users'], {
      $key: { $first: 10, email: { $not: null } },
      id: true,
      name: true,
      email: true,
      settings: { foo: true },
    });

    /** @type {GraffyRangeResult} */
    const exp2 = [
      keyref({ $cursor: [id1], email: { $not: null } }, ['users', id1], {
        id: id1,
        name: 'Alice',
        email: 'alice@acme.co',
        settings: { foo: 10 },
      }),
    ];
    exp2.$page = { $all: true, email: { $not: null } };
    exp2.$next = null;
    exp2.$prev = null;
    expect(res2).toEqual(exp2);
    expect(res2[0].$ref).toEqual(exp2[0].$ref);

    // Third, upsert the same person again.
    const res3 = await store.write(['users', { email: 'alice@acme.co' }], {
      name: 'Alicia',
      settings: { bar: 5 },
      $put: true,
    });

    expect(res3).toEqual(
      keyref(
        { email: 'alice@acme.co' },
        ['users', id1],
        // The ID should be unchanged
        // { name: 'Alice Example' }

        // Ideally, the current object should be echoed here.
        // However, it gets stripped out by the store.write()
        // unwrap result step. TODO: inter-link data before
        // unwrap.
      ),
    );

    // Fourth, put a user Alan using a client-generated ID
    const id2 = uuid();
    const res4 = await store.write(['users', id2], {
      name: 'alan',
      email: 'alan@acme.co',
      settings: { bar: 3, baz: { x: 4, y: 5 } },
      $put: true,
    });

    expect(res4).toEqual({
      id: id2,
      name: 'alan',
      email: 'alan@acme.co',
      settings: { bar: 3, baz: { x: 4, y: 5 } },
      version: expect.any(Number),
    });

    // Fifth, get all users with names starting with "al" (case insensitive)
    // with case-insensitive sorting

    const res5 = await store.read(['users'], {
      $key: { $first: 10, name: { $ire: '^al' }, $order: ['name', 'id'] },
      id: true,
      name: true,
      email: true,
      settings: { foo: true, bar: true, baz: { x: true, y: true } },
    });

    // console.log(res5);

    /** @type {GraffyRangeResult} */
    const exp5 = [
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
    ];
    exp5.$page = {
      $all: true,
      name: { $ire: '^al' },
      $order: ['name', 'id'],
    };
    exp5.$next = null;
    exp5.$prev = null;
    expect(res5).toEqual(exp5);

    // Sixth, update Alan to Alain using email address

    const res6 = await store.write(['users'], {
      $key: { email: 'alan@acme.co' },
      name: 'alain',
      settings: { foo: 7, baz: { x: null, y: 8 } },
    });

    expect(res6).toEqual([
      keyref({ email: 'alan@acme.co' }, ['users', id2]),
      {
        $key: id2,
        id: id2,
        name: 'alain',
        email: 'alan@acme.co',
        settings: {
          foo: 7,
          bar: 3,
          baz: { y: 8 },
        },
        version: expect.any(Number),
      },
    ]);

    // Seventh, get all users with names starting with "al" (case sensitive)

    const res7 = await store.read(['users'], {
      $key: { $first: 10, name: { $re: '^al' }, $order: ['name', 'id'] },
      id: true,
      name: true,
      email: true,
    });

    /** @type {GraffyRangeResult} */
    const exp7 = [
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
    ];
    exp7.$page = {
      $all: true,
      name: { $re: '^al' },
      $order: ['name', 'id'],
    };
    exp7.$next = null;
    exp7.$prev = null;
    expect(res7).toEqual(exp7);
  });

  test('json_with_array', async () => {
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
    /** @type {GraffyRangeResult} */
    const exp1 = [
      keyref({ $order: ['email'], $cursor: ['a'] }, expect.any(Array), {
        name: 'A',
        email: 'a',
        settings: put({ foo: put([1, 2, 3]) }),
      }),
      keyref({ $order: ['email'], $cursor: ['b'] }, expect.any(Array), {
        name: 'B',
        email: 'b',
        settings: put({ foo: put([3]), bar: put([4]) }),
      }),
      keyref({ $order: ['email'], $cursor: ['c'] }, expect.any(Array), {
        name: 'C',
        email: 'c',
        settings: put({ bar: put([5, 6]) }),
      }),
      keyref({ $order: ['email'], $cursor: ['d'] }, expect.any(Array), {
        name: 'D',
        email: 'd',
        settings: null,
      }),
    ];

    exp1.$page = { $all: true, $order: ['email'] };
    exp1.$next = null;
    exp1.$prev = null;

    expect(res1).toEqual(exp1);

    // 2. Anything in array

    const res2 = await store.read('users', {
      $key: { settings: { $cts: { foo: [] } }, $order: ['email'], $all: true },
      email: true,
    });

    /** @type {GraffyRangeResult} */
    const exp2 = [
      keyref(
        {
          settings: { $cts: { foo: [] } },
          $order: ['email'],
          $cursor: [expect.any(String)],
        },
        expect.any(Array),
        { email: 'a' },
      ),
      keyref(
        {
          settings: { $cts: { foo: [] } },
          $order: ['email'],
          $cursor: [expect.any(String)],
        },
        expect.any(Array),
        { email: 'b' },
      ),
    ];

    exp2.$page = {
      settings: { $cts: { foo: [] } },
      $order: ['email'],
      $all: true,
    };
    exp2.$next = null;
    exp2.$prev = null;

    expect(res2).toEqual(exp2);

    // 3. Specific value in array

    const res3 = await store.read('users', {
      $key: { settings: { $cts: { bar: [4] } }, $order: ['email'], $all: true },
      email: true,
    });

    /** @type {GraffyRangeResult} */
    const exp3 = [
      keyref(
        {
          settings: { $cts: { bar: [4] } },
          $order: ['email'],
          $cursor: [expect.any(String)],
        },
        expect.any(Array),
        { email: 'b' },
      ),
    ];

    exp3.$page = {
      settings: { $cts: { bar: [4] } },
      $order: ['email'],
      $all: true,
    };
    exp3.$next = null;
    exp3.$prev = null;

    expect(res3).toEqual(exp3);
  });

  test('pass_through', async () => {
    const uid = uuid();
    const pid = uuid();
    const res1 = await store.write({
      users: { [uid]: { name: 'Alice', $put: true } },
      posts: { [pid]: { title: 'A story', authorId: uid, $put: true } },
    });

    const exp1 = {
      users: {
        [uid]: {
          id: uid,
          name: 'Alice',
          email: null,
          settings: null,
          version: expect.any(Number),
        },
      },
      posts: {
        [pid]: {
          id: pid,
          title: 'A story',
          authorId: uid,
          version: expect.any(Number),
          commenters: null,
          scores: null,
        },
      },
    };

    expect(res1).toEqual(exp1);

    const res2 = await store.read({
      users: { [uid]: { name: true } },
      posts: { [pid]: { title: true } },
    });

    const exp2 = {
      users: { [uid]: { name: 'Alice' } },
      posts: { [pid]: { title: 'A story' } },
    };

    expect(res2).toEqual(exp2);
  });

  test('dot_operator', async () => {
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
    expect(res1).toEqual(exp1);

    const res2 = await store.read(['users'], {
      $key: { 'settings.bar': 9, $all: true },
      name: true,
    });

    /** @type {GraffyRangeResult} */
    const exp2 = [
      keyref({ 'settings.bar': 9, $cursor: [uid] }, ['users', uid], {
        name: 'Alice',
      }),
    ];
    exp2.$page = { 'settings.bar': 9, $all: true };
    exp2.$next = null;
    exp2.$prev = null;
    expect(res2).toEqual(exp2);
  });

  test('delete', async () => {
    const uid = uuid();
    const res1 = await store.write(['users', uid], {
      name: 'Alice',
      $put: true,
    });

    const exp1 = {
      id: uid,
      name: 'Alice',
      email: null,
      settings: null,
      version: expect.any(Number),
    };

    expect(res1).toEqual(exp1);

    const res2 = await store.write(['users', uid], null);

    expect(res2).toEqual(null);
  });

  describe('order', () => {
    beforeEach(async () => {
      await store.write('users', [
        {
          $key: uuid(),
          $put: true,
          name: 'A',
          email: 'a',
          settings: { x: 3 },
        },
        {
          $key: uuid(),
          $put: true,
          name: 'B',
          email: 'b',
          settings: { x: 5 },
        },
        {
          $key: uuid(),
          $put: true,
          name: 'C',
          email: 'c',
          settings: { x: 4 },
        },
      ]);
    });

    test('asc', async () => {
      const res1 = await store.read('users', {
        $key: { $order: ['settings.x'], $all: true },
        name: true,
      });

      /** @type {GraffyRangeResult} */
      const exp1 = [
        keyref(
          { $cursor: [3], $order: ['settings.x'] },
          ['users', expect.any(String)],
          {
            name: 'A',
          },
        ),
        keyref(
          { $cursor: [4], $order: ['settings.x'] },
          ['users', expect.any(String)],
          {
            name: 'C',
          },
        ),
        keyref(
          { $cursor: [5], $order: ['settings.x'] },
          ['users', expect.any(String)],
          {
            name: 'B',
          },
        ),
      ];

      exp1.$page = { $order: ['settings.x'], $all: true };
      exp1.$prev = null;
      exp1.$next = null;

      expect(res1).toEqual(exp1);
    });

    test('desc', async () => {
      const res1 = await store.read('users', {
        $key: { $order: ['!settings.x'], $all: true },
        name: true,
      });

      /** @type {GraffyRangeResult} */
      const exp1 = [
        keyref(
          { $cursor: [-5], $order: ['!settings.x'] },
          ['users', expect.any(String)],
          {
            name: 'B',
          },
        ),
        keyref(
          { $cursor: [-4], $order: ['!settings.x'] },
          ['users', expect.any(String)],
          {
            name: 'C',
          },
        ),
        keyref(
          { $cursor: [-3], $order: ['!settings.x'] },
          ['users', expect.any(String)],
          {
            name: 'A',
          },
        ),
      ];

      exp1.$page = { $order: ['!settings.x'], $all: true };
      exp1.$prev = null;
      exp1.$next = null;

      expect(res1).toEqual(exp1);
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

    test('count', async () => {
      const res1 = await store.read('users', {
        $key: { name: { $not: null }, $group: true },
        $count: true,
      });

      expect(res1[0].$count).toEqual(4);
    });

    test('card', async () => {
      const res1 = await store.read('users', {
        $key: { $group: true },
        $card: { name: true },
      });

      expect(res1[0].$card.name).toEqual(3);
    });

    test('sum', async () => {
      const res1 = await store.read('users', {
        $key: { $group: true },
        $sum: { 'settings.foo.0': true },
      });

      expect(res1[0].$sum['settings.foo.0']).toEqual(4);
    });

    test('grouped_card', async () => {
      const res1 = await store.read('users', {
        $key: { $group: ['name'], $all: true },
        $card: { email: true },
      });

      /** @type {GraffyRangeResult} */
      const exp1 = [
        { $card: { email: 1 }, $key: { $group: ['name'], $cursor: ['A'] } },
        { $card: { email: 1 }, $key: { $group: ['name'], $cursor: ['B'] } },
        { $card: { email: 2 }, $key: { $group: ['name'], $cursor: ['C'] } },
      ];

      exp1.$page = { $group: ['name'], $all: true };
      exp1.$prev = null;
      exp1.$next = null;

      expect(res1).toEqual(exp1);
    });

    test('group_count_sum', async () => {
      const res1 = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      expect(res1[0].$count).toEqual(2);
      expect(res1[0].$sum['data.Amount']).toEqual(10100);
    });

    test('group_count_avg', async () => {
      const res1 = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $avg: { 'data.Amount': true },
      });

      expect(res1[0].$count).toEqual(2);
      expect(res1[0].$avg['data.Amount']).toEqual(5050);
    });

    test('group_count_max', async () => {
      const res1 = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $max: { 'data.Amount': true },
      });

      expect(res1[0].$count).toEqual(2);
      expect(res1[0].$max['data.Amount']).toEqual(10000);
    });

    test('group_count_min', async () => {
      const res1 = await store.read('prospect', {
        $key: { $first: 1, isDeleted: false, $group: ['isDeleted'] },
        $count: true,
        $min: { 'data.Amount': true },
      });

      expect(res1[0].$count).toEqual(2);
      expect(res1[0].$min['data.Amount']).toEqual(100);
    });

    test('group_true_filter', async () => {
      const res1 = await store.read('prospect', {
        $key: { isDeleted: false, $group: true },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      expect(res1[0].$count).toEqual(2);
      expect(res1[0].$sum['data.Amount']).toEqual(10100);
    });

    test('group_true_range', async () => {
      const res1 = await store.read('prospect', {
        $key: { isDeleted: false, $group: true, $first: 1 },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      expect(res1[0].$count).toEqual(2);
      expect(res1[0].$sum['data.Amount']).toEqual(10100);
    });

    test('group_all', async () => {
      const res1 = await store.read('prospect', {
        $key: { $group: ['isDeleted'], $all: true },
        $count: true,
        $sum: { 'data.Amount': true },
      });

      const map = {};
      for (const prospect of res1) {
        map[prospect.$sum['data.Amount']] = true;
      }

      expect(res1.length).toEqual(2);
      expect(map[10100]).toEqual(true);
      expect(map[1010]).toEqual(true);
    });
  });

  test('without_transaction', async () => {
    const id = uuid();

    try {
      await store.write({
        users: {
          $key: id,
          $put: true,
          name: 'A',
          email: 'a',
        },
        posts: {
          $key: 'nevermind',
          title: 'Fail',
        },
      });
    } catch (_) {
      /* Do nothing. */
    }

    const res = await store.read(['users', id], { name: true });
    expect(res).toEqual({ name: 'A' });
  });

  test('with_transaction', async () => {
    const id = uuid();
    const pgClient = await getPool().connect();
    await pgClient.query('BEGIN');

    try {
      await store.write(
        {
          users: {
            $key: id,
            $put: true,
            name: 'A',
            email: 'a',
          },
          posts: {
            $key: 'nevermind',
            title: 'Fail',
          },
        },
        { pgClient },
      );
      await pgClient.query('COMMIT');
    } catch (_) {
      await pgClient.query('ROLLBACK');
    }

    await pgClient.release();

    const res = await store.read(['users', id], { name: true });
    expect(res).toEqual({ name: null });
  });

  test('complex_types', async () => {
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

    const exp1 = {
      [pid1]: {
        id: pid1,
        authorId: null,
        title: 'Post One',
        commenters: ['alice', 'bob', 'charlie'],
        scores: '(5, 10, 0)', // We won't actually be reading these. Ever.
        version: expect.any(Number),
      },
      [pid2]: {
        id: pid2,
        authorId: null,
        title: 'Post Two',
        commenters: ['alice', 'debra'],
        scores: '(-1, 3, 0)',
        version: expect.any(Number),
      },
    };

    // Implicit array $put
    Object.defineProperty(exp1[pid1].commenters, '$put', {
      value: [{ $since: 0, $until: Infinity }],
    });
    Object.defineProperty(exp1[pid2].commenters, '$put', {
      value: [{ $since: 0, $until: Infinity }],
    });

    expect(res1[pid1].commenters).toEqual(exp1[pid1].commenters);

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

    /** @type {GraffyRangeResult} */
    const exp2 = [
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
    ];
    exp2.$page = {
      $all: true,
      scores: {
        $ctd: [
          [0, null, 0],
          [null, 20, 0],
        ],
      },
    };
    exp2.$prev = null;
    exp2.$next = null;

    expect(res2).toEqual(exp2);

    // Case 3: Array query

    const res3 = await store.read('posts', {
      $key: {
        $all: true,
        commenters: { $cts: ['bob'] },
      },
      title: true,
    });

    /** @type {GraffyRangeResult} */
    const exp3 = [
      keyref(
        {
          commenters: { $cts: ['bob'] },
          $cursor: [pid1],
        },
        ['posts', pid1],
        { title: 'Post One' },
      ),
    ];
    exp3.$page = {
      $all: true,
      commenters: { $cts: ['bob'] },
    };
    exp3.$prev = null;
    exp3.$next = null;

    expect(res3).toEqual(exp3);
  });

  describe('no_filter', () => {
    test('one_result', async () => {
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
      /** @type {GraffyRangeResult} */
      const exp = [{ $key: [expect.any(String)], name: 'A' }];
      (exp.$page = { $all: true }), (exp.$next = null);
      exp.$prev = null;
      expect(res).toEqual(exp);
    });
  });

  describe('json_lookup_and_operators', () => {
    beforeEach(async () => {
      await resetTables();
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
      const exp = results.map((name) =>
        keyref(
          { ...filter, $cursor: [expect.any(String)] },
          ['users', expect.any(String)],
          { name },
        ),
      );
      exp.$page = { ...filter, $all: true };
      exp.$next = null;
      exp.$prev = null;

      expect(res).toEqual(exp);
    }

    test('str_eq', async () => doTest({ 'settings.str': 'hello' }, ['A']));
    test('str_neq', async () =>
      doTest({ 'settings.str': { $not: 'world' } }, ['A']));
    test('str_in', async () =>
      doTest({ 'settings.str': ['hello', 'bonjour'] }, ['A']));
    test('str_nin', async () =>
      doTest({ 'settings.str': { $not: ['hello', 'bonjour'] } }, ['B']));
    test('str_re', async () =>
      doTest({ 'settings.str': { $re: 'h.*' } }, ['A']));
    test('str_ire', async () =>
      doTest({ 'settings.str': { $ire: 'H.*' } }, ['A']));

    test('num_eq', async () => doTest({ 'settings.num': 10 }, ['A']));
    test('num_neq', async () =>
      doTest({ 'settings.num': { $not: 10 } }, ['B']));
    test('num_in', async () => doTest({ 'settings.num': [9, 10, 11] }, ['A']));
    test('num_nin', async () =>
      doTest({ 'settings.num': { $not: [14, 15, 16] } }, ['A']));
    test('num_lt', async () => doTest({ 'settings.num': { $lt: 12 } }, ['A']));
    test('num_gt', async () => doTest({ 'settings.num': { $gt: 13 } }, ['B']));
  });
});
