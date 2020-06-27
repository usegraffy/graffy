import Graffy from '../Graffy';
import GraffyFill from '@graffy/fill';
import { key, link, scalar } from '@graffy/common';

test('Porcelain read', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const expectedBooksQuery = [
    { first: 2 },
    {
      title: true,
      author: { name: true },
    },
  ];

  const expectedUsersQuery = {
    clarke: { name: true },
    orwell: { name: true },
  };

  const onReadBooks = jest.fn(() => ({
    [key('1984')]: { title: '1984', author: link('/users/orwell') },
    [key('2001')]: { title: '2001', author: link('/users/clarke') },
  }));

  const onReadUsers = jest.fn(() => ({
    orwell: { name: 'George Orwell' },
    clarke: { name: 'Arthur C Clarke' },
  }));

  store.onRead('/books', onReadBooks);
  store.onRead('/users', onReadUsers);

  const result = await store.read('/books', [
    { first: 2 },
    {
      title: true,
      author: { name: true },
    },
  ]);
  const expectedResult = [
    {
      title: '1984',
      author: { name: 'George Orwell' },
    },
    {
      title: '2001',
      author: { name: 'Arthur C Clarke' },
    },
  ];
  Object.defineProperty(expectedResult, 'pageInfo', {
    value: {
      start: undefined,
      end: '2001',
      hasPrev: false,
      hasNext: true,
    },
  });

  expect(onReadBooks).toHaveBeenCalledWith(
    expectedBooksQuery,
    expect.any(Object),
  );
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
    yield {
      [key('1984')]: { title: '1984', author: link('/users/orwell') },
      [key('2001')]: { title: '2001', author: link('/users/clarke') },
    };
    await forever;
  };

  const onWatchUsers = async function* onWatchUsers() {
    yield {
      orwell: { name: 'George Orwell' },
      clarke: { name: 'Arthur C Clarke' },
    };
    await forever;
  };

  store.onWatch('/books', onWatchBooks);
  store.onWatch('/users', onWatchUsers);

  const result = store.watch('/books', [
    { first: 2 },
    {
      title: true,
      author: { name: true },
    },
  ]);
  const expectedResult = [
    {
      title: '1984',
      author: { name: 'George Orwell' },
    },
    {
      title: '2001',
      author: { name: 'Arthur C Clarke' },
    },
  ];
  Object.defineProperty(expectedResult, 'pageInfo', {
    value: {
      start: undefined,
      end: '2001',
      hasPrev: false,
      hasNext: true,
    },
  });

  expect((await result.next()).value).toEqual(expectedResult);
});

test('write array value', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const provider = jest.fn((change) => {
    expect(change).toEqual({ foo: ['hello', 'world'] });
    return change;
  });
  store.onWrite(provider);

  await store.write({ foo: scalar(['hello', 'world']) });
  expect(provider).toBeCalled();
});

test('read array value', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const provider = jest.fn(() => {
    return { foo: scalar(['hello', 'world']) };
  });
  store.onRead(provider);

  const result = await store.read({ foo: 1 });
  expect(provider).toBeCalled();
  expect(result).toEqual({ foo: ['hello', 'world'] });
});
