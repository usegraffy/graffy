import Graffy from '../Graffy.js';
import GraffyFill from '@graffy/fill';

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

  const expectedResult = [
    {
      $key: ['1984'],
      title: '1984',
      author: { $ref: ['users', 'orwell'], name: 'George Orwell' },
    },
    {
      $key: ['2001'],
      title: '2001',
      author: { $ref: ['users', 'clarke'], name: 'Arthur C Clarke' },
    },
  ];
  expectedResult.$key = { $all: true, $until: ['2001'] };
  expectedResult.$next = { $first: 2, $after: ['2001'] };
  expectedResult.$prev = null;

  expect(onReadBooks).toHaveBeenCalledWith(
    expectedBooksQuery,
    expect.any(Object),
  );
  expect(onReadBooks.mock.calls[0][0].$key).toEqual(expectedBooksQuery.$key);
  expect(onReadUsers).toHaveBeenCalledWith(
    expectedUsersQuery,
    expect.any(Object),
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
  const expectedResult = [
    {
      $key: ['1984'],
      title: '1984',
      author: { $ref: ['users', 'orwell'], name: 'George Orwell' },
    },
    {
      $key: ['2001'],
      title: '2001',
      author: { $ref: ['users', 'clarke'], name: 'Arthur C Clarke' },
    },
  ];
  expectedResult.$key = { $all: true, $until: ['2001'] };
  expectedResult.$next = { $first: 2, $after: ['2001'] };
  expectedResult.$prev = null;

  expect((await result.next()).value).toEqual(expectedResult);
});

test('write array value', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const provider = jest.fn((change) => {
    const expected = ['hello', 'world'];
    expected.$val = true;
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
  const expected = ['hello', 'world'];
  expected.$val = true;
  expect(result).toEqual({ foo: expected });
});
