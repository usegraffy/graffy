import Graffy from '../Graffy';
import GraffyFill from '@graffy/fill';
import { link } from '@graffy/common';

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
    '1984': { title: '1984', author: link('/users/orwell') },
    '2001': { title: '2001', author: link('/users/clarke') },
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
      start: '',
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
      '1984': { title: '1984', author: link('/users/orwell') },
      '2001': { title: '2001', author: link('/users/clarke') },
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
      start: '',
      end: '2001',
      hasPrev: false,
      hasNext: true,
    },
  });

  expect((await result.next()).value).toEqual(expectedResult);
});
