import GraffyFill from '@graffy/fill';
import { page, ref } from '@graffy/testing';
import { jest } from '@jest/globals';
import Graffy, { unchanged } from '../Graffy.js';

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

  const onReadBooks = jest.fn(() => [
    { $key: ['1984'], title: '1984', author: { $ref: 'users.orwell' } },
    { $key: ['2001'], title: '2001', author: { $ref: 'users.clarke' } },
  ]);

  const onReadUsers = jest.fn(() => ({
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

  expect(onReadBooks).toHaveBeenCalledWith(
    expectedBooksQuery,
    expect.any(Object),
    expect.any(Function),
  );
  expect(onReadBooks.mock.calls[0][0].$key).toEqual(expectedBooksQuery.$key);
  expect(onReadUsers).toHaveBeenCalledWith(
    expectedUsersQuery,
    expect.any(Object),
    expect.any(Function),
  );
  expect(result).toEqual(expectedResult);
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

  expect((await result.next()).value).toEqual(expectedResult);
});

test('write array value', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const provider = jest.fn((change) => {
    const expected = ['hello', 'world'];
    Object.defineProperty(expected, '$val', { value: true });
    expect(change).toEqual({ foo: expected });
    return { foo: { $val: ['hello', 'world'] } };
  });
  store.onWrite(provider);

  await store.write({ foo: { $val: ['hello', 'world'] } });
  expect(provider).toBeCalled();
});

test('read array value', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const provider = jest.fn(() => {
    return { foo: { $val: ['hello', 'world'] } };
  });
  store.onRead(provider);

  const result = await store.read({ foo: 1 });
  expect(provider).toBeCalled();

  /** @type {string[] & { $val?: true }} */
  const expected = ['hello', 'world'];
  expected.$val = true;
  expect(result).toEqual({ foo: expected });
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

  expect(result).toEqual(expected);
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
  expect(result).toEqual(expected);
});

test('read_leaf', async () => {
  const store = new Graffy();
  const provider = jest.fn(() => ({ bar: 44 }));
  store.onRead('foo', provider);
  const res = await store.read('foo.bar', true);

  expect(provider).toHaveBeenCalledWith(
    { bar: true },
    {},
    expect.any(Function),
  );
  expect(res).toBe(44);
});

test('write_leaf', async () => {
  const store = new Graffy();
  const provider = jest.fn(() => ({ bar: 45 }));
  store.onWrite('foo', provider);
  const res = await store.write('foo.bar', 45);

  expect(provider).toHaveBeenCalledWith({ bar: 45 }, {}, expect.any(Function));
  expect(res).toBe(45);
});

test('delete_leaf', async () => {
  const store = new Graffy();
  const provider = jest.fn(() => ({ bar: null }));
  store.onWrite('foo', provider);
  const res = await store.write('foo.bar', null);

  expect(provider).toHaveBeenCalledWith(
    { bar: null },
    {},
    expect.any(Function),
  );
  expect(res).toBe(null);
});

test('read_key', async () => {
  const store = new Graffy();
  const provider = jest.fn(() => ({ bar: 44 }));
  store.onRead('foo', provider);
  const res = await store.read('foo', { $key: 'bar' });

  expect(provider).toHaveBeenCalledWith(
    { bar: true },
    {},
    expect.any(Function),
  );
  expect(res).toEqual([44]); // Can't add $key:bar on the number 44
});

test('read_array_key', async () => {
  const store = new Graffy();
  const provider = jest.fn(() => ({ bar: 44 }));
  store.onRead('foo', provider);
  const res = await store.read('foo', [{ $key: 'bar' }]);

  expect(provider).toHaveBeenCalledWith(
    { bar: true },
    {},
    expect.any(Function),
  );
  expect(res).toEqual([44]);
});

test('write_key', async () => {
  const store = new Graffy();
  const provider = jest.fn(() => ({ bar: 44 }));
  store.onWrite('foo', provider);
  const res = await store.write('foo', { $key: 'bar', $val: 44 });

  expect(provider).toHaveBeenCalledWith({ bar: 44 }, {}, expect.any(Function));
  expect(res).toEqual({ bar: 44 });
});

test('write_array_key', async () => {
  const store = new Graffy();
  const provider = jest.fn(() => ({ bar: 44 }));
  store.onWrite('foo', provider);
  const res = await store.write('foo', [{ $key: 'bar', $val: 44 }]);

  expect(provider).toHaveBeenCalledWith({ bar: 44 }, {}, expect.any(Function));
  expect(res).toEqual({ bar: 44 });
});

test('write_key_put', async () => {
  const store = new Graffy();
  const provider = jest.fn(() => ({ bar: { baz: 4, $put: true } }));
  store.onWrite('foo', provider);
  const res = await store.write('foo', { $key: 'bar', $put: true, baz: 4 });

  expect(provider).toHaveBeenCalledWith(
    { bar: { baz: 4 } },
    {},
    expect.any(Function),
  );
  expect(res).toEqual({ bar: { baz: 4 } });
  expect(res.bar.$put).toBe(true);
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
  expect(res).toEqual({
    post: {
      abc: {
        author: ref(['user', '123'], { name: 'Alice' }),
        title: 'Example',
      },
    },
  });
});

test('modified_next_options', async () => {
  // @ts-ignore bad jest mockResolvedValue definitions?
  const mockOnRead = jest.fn().mockResolvedValue({ 123: { name: 'Alice' } });
  const query = { 123: { name: true } };
  const store = new Graffy();
  store.use(GraffyFill());
  store.onRead('user', (query, _options, next) => {
    return next(query, { bar: true });
  });
  store.onRead('user', mockOnRead);
  await store.read('user', query, { foo: 2 });
  expect(mockOnRead).toBeCalledWith(query, { bar: true }, expect.any(Function));
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

  test.each(cases)(
    'read nextChanged:%j retChanged:%j',
    async (nextChanged, retChanged) => {
      store.onRead('example', async (_query, _options, next) => {
        await next(nextChanged ? changedQuery : unchanged);
        return retChanged ? changedResult : unchanged;
      });

      store.onRead('example', async (query, _options) => {
        expect(query).toEqual(nextChanged ? changedQuery : originalQuery);
        return originalResult;
      });

      const result = await store.read('example', originalQuery);
      expect(result).toEqual(retChanged ? changedResult : originalResult);
    },
  );

  test.each(cases)(
    'write nextChanged:%j retChanged:%j',
    async (nextChanged, retChanged) => {
      store.onWrite('example', async (_change, _options, next) => {
        await next(nextChanged ? changedChange : unchanged);
        return retChanged ? changedResult : unchanged;
      });

      store.onWrite('example', async (change, _options) => {
        expect(change).toEqual(nextChanged ? changedChange : originalChange);
        return originalResult;
      });

      const result = await store.write('example', originalChange);
      expect(result).toEqual(retChanged ? changedResult : originalResult);
    },
  );
});
