import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';
import GraffyFill from '@graffy/fill';
import { page, ref } from '@graffy/testing';
import Graffy, { unchanged } from '../Graffy.ts';

test('Porcelain read', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const expectedBooksQuery = [
    {
      $key: { $first: 2 },
      title: true,
      author: { name: true },
    },
  ];

  const expectedUsersQuery = {
    clarke: { name: true },
    orwell: { name: true },
  };

  const onReadBooks = mock.fn(() => [
    { $key: ['1984'], title: '1984', author: { $ref: 'users.orwell' } },
    { $key: ['2001'], title: '2001', author: { $ref: 'users.clarke' } },
  ]);

  const onReadUsers = mock.fn(() => ({
    orwell: { name: 'George Orwell' },
    clarke: { name: 'Arthur C Clarke' },
  }));

  store.onRead('books', onReadBooks);
  store.onRead('users', onReadUsers);

  const result = await store.read('books', {
    $key: { $first: 2 },
    title: true,
    author: { name: true },
  });

  const expectedResult = page({ $until: ['2001'] }, 2, [
    {
      $key: ['1984'],
      title: '1984',
      author: ref(['users', 'orwell'], { name: 'George Orwell' }),
    },
    {
      $key: ['2001'],
      title: '2001',
      author: ref(['users', 'clarke'], { name: 'Arthur C Clarke' }),
    },
  ]);

  assert.ok(onReadBooks.mock.callCount() > 0);
  assert.deepStrictEqual(
    onReadBooks.mock.calls[0].arguments[0],
    expectedBooksQuery,
  );
  assert.deepStrictEqual(
    onReadBooks.mock.calls[0].arguments[0].$key,
    expectedBooksQuery.$key,
  );
  assert.ok(onReadUsers.mock.callCount() > 0);
  assert.deepStrictEqual(
    onReadUsers.mock.calls[0].arguments[0],
    expectedUsersQuery,
  );
  assert.deepStrictEqual(result, expectedResult);
});

const forever = new Promise(() => {});

test('Porcelain subscription', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const onWatchBooks = async function* onWatchBooks() {
    yield [
      {
        $key: ['1984'],
        title: '1984',
        author: { $ref: 'users.orwell' },
      },
      {
        $key: ['2001'],
        title: '2001',
        author: { $ref: 'users.clarke' },
      },
    ];
    await forever;
  };

  const onWatchUsers = async function* onWatchUsers() {
    yield {
      orwell: { name: 'George Orwell' },
      clarke: { name: 'Arthur C Clarke' },
    };
    await forever;
  };

  store.onWatch('books', onWatchBooks);
  store.onWatch('users', onWatchUsers);

  const result = store.watch('books', {
    $key: { $first: 2 },
    title: true,
    author: { name: true },
  });
  const expectedResult = page({ $until: ['2001'] }, 2, [
    {
      $key: ['1984'],
      title: '1984',
      author: ref(['users', 'orwell'], { name: 'George Orwell' }),
    },
    {
      $key: ['2001'],
      title: '2001',
      author: ref(['users', 'clarke'], { name: 'Arthur C Clarke' }),
    },
  ]);

  assert.deepStrictEqual((await result.next()).value, expectedResult);
});

test('write array value', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const provider = mock.fn((change) => {
    const expected = ['hello', 'world'];
    Object.defineProperty(expected, '$val', { value: true });
    assert.deepStrictEqual(change, { foo: expected });
    return { foo: { $val: ['hello', 'world'] } };
  });
  store.onWrite(provider);

  await store.write({ foo: { $val: ['hello', 'world'] } });
  assert.ok(provider.mock.callCount() > 0);
});

test('read array value', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const provider = mock.fn(() => {
    return { foo: { $val: ['hello', 'world'] } };
  });
  store.onRead(provider);

  const result = await store.read({ foo: 1 });
  assert.ok(provider.mock.callCount() > 0);

  /** @type {string[] & { $val?: true }} */
  const expected = ['hello', 'world'];
  expected.$val = true;
  assert.deepStrictEqual(result, { foo: expected });
});

test('basic_range', async () => {
  const query = {
    foo: {
      $key: { $first: 2, bar: 'something' },
      id: 1,
      name: 1,
    },
  };

  const store = new Graffy();

  store.use((_store) => {
    _store.onRead('foo', async (_query, _options) => {
      return [
        {
          $key: { $cursor: [1], bar: 'something' },
          id: 'id-1',
          name: 'name-1',
          address: 'address-1',
        },
        {
          $key: { $cursor: [2], bar: 'something' },
          id: 'id-2',
          name: 'name-2',
          address: 'address-2',
        },
        {
          $key: { $cursor: [3], bar: 'something' },
          id: 'id-3',
          name: 'name-3',
          address: 'address-3',
        },
      ];
    });
  });

  const result = await store.read(query);
  const expected = {
    foo: page({ bar: 'something', $until: [2] }, 2, [
      {
        $key: { $cursor: [1], bar: 'something' },
        id: 'id-1',
        name: 'name-1',
      },
      {
        $key: { $cursor: [2], bar: 'something' },
        id: 'id-2',
        name: 'name-2',
      },
    ]),
  };

  assert.deepStrictEqual(result, expected);
});

test('query_forwarding', async () => {
  /*
    At this point, this is not a requirement:
    The *result*

  */
  const query = {
    foo: {
      $key: { $first: 2, bar: 'something' },
      id: 1,
      name: 1,
    },
  };

  const store = new Graffy();
  const store2 = new Graffy();

  store.use((_store) => {
    _store.onRead('foo', async (_query, _options) => {
      return [
        {
          $key: { $cursor: [1], bar: 'something' },
          id: 'id-1',
          name: 'name-1',
          address: 'address-1',
        },
        {
          $key: { $cursor: [2], bar: 'something' },
          id: 'id-2',
          name: 'name-2',
          address: 'address-2',
        },
        {
          $key: { $cursor: [3], bar: 'something' },
          id: 'id-3',
          name: 'name-3',
          address: 'address-3',
        },
      ];
    });
  });
  store2.onRead((query, options) => store.read(query, options));

  const result = await store2.read(query);
  const expected = {
    foo: page({ bar: 'something', $until: [2] }, 2, [
      {
        $key: {
          $cursor: [1],
          bar: 'something',
        },
        id: 'id-1',
        name: 'name-1',
      },
      {
        $key: {
          $cursor: [2],
          bar: 'something',
        },
        id: 'id-2',
        name: 'name-2',
      },
    ]),
  };
  assert.deepStrictEqual(result, expected);
});

test('read_leaf', async () => {
  const store = new Graffy();
  const provider = mock.fn(() => ({ bar: 44 }));
  store.onRead('foo', provider);
  const res = await store.read('foo.bar', true);

  assert.deepStrictEqual(provider.mock.calls[0].arguments[0], { bar: true });
  assert.deepStrictEqual(provider.mock.calls[0].arguments[1], {});
  assert.ok(typeof provider.mock.calls[0].arguments[2] === 'function');
  assert.strictEqual(res, 44);
});

test('write_leaf', async () => {
  const store = new Graffy();
  const provider = mock.fn(() => ({ bar: 45 }));
  store.onWrite('foo', provider);
  const res = await store.write('foo.bar', 45);

  assert.deepStrictEqual(provider.mock.calls[0].arguments[0], { bar: 45 });
  assert.deepStrictEqual(provider.mock.calls[0].arguments[1], {});
  assert.ok(typeof provider.mock.calls[0].arguments[2] === 'function');
  assert.strictEqual(res, 45);
});

test('delete_leaf', async () => {
  const store = new Graffy();
  const provider = mock.fn(() => ({ bar: null }));
  store.onWrite('foo', provider);
  const res = await store.write('foo.bar', null);

  assert.deepStrictEqual(provider.mock.calls[0].arguments[0], { bar: null });
  assert.deepStrictEqual(provider.mock.calls[0].arguments[1], {});
  assert.ok(typeof provider.mock.calls[0].arguments[2] === 'function');
  assert.strictEqual(res, null);
});

test('read_key', async () => {
  const store = new Graffy();
  const provider = mock.fn(() => ({ bar: 44 }));
  store.onRead('foo', provider);
  const res = await store.read('foo', { $key: 'bar' });

  assert.deepStrictEqual(provider.mock.calls[0].arguments[0], { bar: true });
  assert.deepStrictEqual(provider.mock.calls[0].arguments[1], {});
  assert.ok(typeof provider.mock.calls[0].arguments[2] === 'function');
  assert.deepStrictEqual(res, [44]); // Can't add $key:bar on the number 44
});

test('read_array_key', async () => {
  const store = new Graffy();
  const provider = mock.fn(() => ({ bar: 44 }));
  store.onRead('foo', provider);
  const res = await store.read('foo', [{ $key: 'bar' }]);

  assert.deepStrictEqual(provider.mock.calls[0].arguments[0], { bar: true });
  assert.deepStrictEqual(provider.mock.calls[0].arguments[1], {});
  assert.ok(typeof provider.mock.calls[0].arguments[2] === 'function');
  assert.deepStrictEqual(res, [44]);
});

test('write_key', async () => {
  const store = new Graffy();
  const provider = mock.fn(() => ({ bar: 44 }));
  store.onWrite('foo', provider);
  const res = await store.write('foo', { $key: 'bar', $val: 44 });

  assert.deepStrictEqual(provider.mock.calls[0].arguments[0], { bar: 44 });
  assert.deepStrictEqual(provider.mock.calls[0].arguments[1], {});
  assert.ok(typeof provider.mock.calls[0].arguments[2] === 'function');
  assert.deepStrictEqual(res, { bar: 44 });
});

test('write_array_key', async () => {
  const store = new Graffy();
  const provider = mock.fn(() => ({ bar: 44 }));
  store.onWrite('foo', provider);
  const res = await store.write('foo', [{ $key: 'bar', $val: 44 }]);

  assert.deepStrictEqual(provider.mock.calls[0].arguments[0], { bar: 44 });
  assert.deepStrictEqual(provider.mock.calls[0].arguments[1], {});
  assert.ok(typeof provider.mock.calls[0].arguments[2] === 'function');
  assert.deepStrictEqual(res, { bar: 44 });
});

test('write_key_put', async () => {
  const store = new Graffy();
  const provider = mock.fn(() => ({ bar: { baz: 4, $put: true } }));
  store.onWrite('foo', provider);
  const res = await store.write('foo', { $key: 'bar', $put: true, baz: 4 });

  assert.deepStrictEqual(provider.mock.calls[0].arguments[0], {
    bar: { baz: 4 },
  });
  assert.deepStrictEqual(provider.mock.calls[0].arguments[1], {});
  assert.ok(typeof provider.mock.calls[0].arguments[2] === 'function');
  assert.deepStrictEqual(res, { bar: { baz: 4 } });
  assert.strictEqual(res.bar.$put, true);
});

test('onReadWithNext', async () => {
  const query = { post: { abc: { author: { name: true }, title: true } } };
  const store = new Graffy();
  store.use(GraffyFill());
  store.onRead(async (query, options, next) => {
    const res = await next(query, options);
    // do nothing
    return res;
  });
  store.onRead('post', () => ({
    abc: { author: { $ref: ['user', '123'] }, title: 'Example' },
  }));
  store.onRead('user', () => ({
    123: { name: 'Alice' },
  }));

  const res = await store.read(query);
  assert.deepStrictEqual(res, {
    post: {
      abc: {
        author: ref(['user', '123'], { name: 'Alice' }),
        title: 'Example',
      },
    },
  });
});

test('modified_next_options', async () => {
  const mockOnRead = mock.fn(async () => ({ 123: { name: 'Alice' } }));
  const query = { 123: { name: true } };
  const store = new Graffy();
  store.use(GraffyFill());
  store.onRead('user', (query, _options, next) => {
    return next(query, { bar: true });
  });
  store.onRead('user', mockOnRead);
  await store.read('user', query, { foo: 2 });
  assert.deepStrictEqual(mockOnRead.mock.calls[0].arguments[0], query);
  assert.deepStrictEqual(mockOnRead.mock.calls[0].arguments[1], { bar: true });
  assert.ok(typeof mockOnRead.mock.calls[0].arguments[2] === 'function');
});

describe('unchanged', () => {
  let store;

  const originalQuery = { foo: true };
  const changedQuery = { foo: true, bar: true };
  const originalChange = { foo: 5 };
  const changedChange = { foo: 8, bar: 6 };
  const originalResult = { foo: 10 };
  const changedResult = { foo: 8 };

  const cases = [
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ];

  beforeEach(() => {
    store = new Graffy();
  });

  for (const [nextChanged, retChanged] of cases) {
    test(`read nextChanged:${JSON.stringify(nextChanged)} retChanged:${JSON.stringify(retChanged)}`, async () => {
      store.onRead('example', async (_query, _options, next) => {
        await next(nextChanged ? changedQuery : unchanged);
        return retChanged ? changedResult : unchanged;
      });

      store.onRead('example', async (query, _options) => {
        assert.deepStrictEqual(
          query,
          nextChanged ? changedQuery : originalQuery,
        );
        return originalResult;
      });

      const result = await store.read('example', originalQuery);
      assert.deepStrictEqual(
        result,
        retChanged ? changedResult : originalResult,
      );
    });
  }

  for (const [nextChanged, retChanged] of cases) {
    test(`write nextChanged:${JSON.stringify(nextChanged)} retChanged:${JSON.stringify(retChanged)}`, async () => {
      store.onWrite('example', async (_change, _options, next) => {
        await next(nextChanged ? changedChange : unchanged);
        return retChanged ? changedResult : unchanged;
      });

      store.onWrite('example', async (change, _options) => {
        assert.deepStrictEqual(
          change,
          nextChanged ? changedChange : originalChange,
        );
        return originalResult;
      });

      const result = await store.write('example', originalChange);
      assert.deepStrictEqual(
        result,
        retChanged ? changedResult : originalResult,
      );
    });
  }
});
