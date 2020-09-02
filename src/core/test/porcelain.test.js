import Graffy from '../Graffy';
import GraffyFill from '@graffy/fill';

test('Porcelain read', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const expectedBooksQuery = {
    title: true,
    author: { name: true },
  };
  Object.defineProperty(expectedBooksQuery, '_key_', { value: { first: 2 } });

  const expectedUsersQuery = {
    clarke: { name: true },
    orwell: { name: true },
  };

  const onReadBooks = jest.fn(() => [
    { _key_: ['1984'], title: '1984', author: { _ref_: 'users.orwell' } },
    { _key_: ['2001'], title: '2001', author: { _ref_: 'users.clarke' } },
  ]);

  const onReadUsers = jest.fn(() => ({
    orwell: { name: 'George Orwell' },
    clarke: { name: 'Arthur C Clarke' },
  }));

  store.onRead('books', onReadBooks);
  store.onRead('users', onReadUsers);

  const result = await store.read('books', {
    _key_: { first: 2 },
    title: true,
    author: { name: true },
  });

  const expectedResult = [
    {
      _key_: ['1984'],
      title: '1984',
      author: { _ref_: ['users', 'orwell'], name: 'George Orwell' },
    },
    {
      _key_: ['2001'],
      title: '2001',
      author: { _ref_: ['users', 'clarke'], name: 'Arthur C Clarke' },
    },
  ];
  Object.defineProperty(expectedResult, 'pageInfo', {
    value: {
      start: undefined,
      end: ['2001'],
      hasPrev: false,
      hasNext: true,
      until: ['2001'],
    },
  });

  expect(onReadBooks).toHaveBeenCalledWith(
    expectedBooksQuery,
    expect.any(Object),
  );
  expect(onReadBooks.mock.calls[0][0]._key_).toEqual(expectedBooksQuery._key_);
  expect(onReadUsers).toHaveBeenCalledWith(
    expectedUsersQuery,
    expect.any(Object),
  );
  expect(result.pageInfo).toEqual(expectedResult.pageInfo);
  expect(result).toEqual(expectedResult);
});

const forever = new Promise(() => {});

test('Porcelain subscription', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const onWatchBooks = async function* onWatchBooks() {
    yield [
      {
        _key_: ['1984'],
        title: '1984',
        author: { _ref_: 'users.orwell' },
      },
      {
        _key_: ['2001'],
        title: '2001',
        author: { _ref_: 'users.clarke' },
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
    _key_: { first: 2 },
    title: true,
    author: { name: true },
  });
  const expectedResult = [
    {
      _key_: ['1984'],
      title: '1984',
      author: { _ref_: ['users', 'orwell'], name: 'George Orwell' },
    },
    {
      _key_: ['2001'],
      title: '2001',
      author: { _ref_: ['users', 'clarke'], name: 'Arthur C Clarke' },
    },
  ];

  expect((await result.next()).value).toEqual(expectedResult);
});

test('write array value', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const provider = jest.fn((change) => {
    expect(change).toEqual({ foo: ['hello', 'world'] });
    return { foo: { _ref_: ['hello', 'world'] } };
  });
  store.onWrite(provider);

  await store.write({ foo: { _val_: ['hello', 'world'] } });
  expect(provider).toBeCalled();
});

test('read array value', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const provider = jest.fn(() => {
    return { foo: { _val_: ['hello', 'world'] } };
  });
  store.onRead(provider);

  const result = await store.read({ foo: 1 });
  expect(provider).toBeCalled();
  expect(result).toEqual({ foo: ['hello', 'world'] });
});
