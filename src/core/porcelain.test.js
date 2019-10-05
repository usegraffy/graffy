import Graffy from './Graffy';
import GraffyFill from '@graffy/fill';
import { link } from '@graffy/common';

test('Porcelain get', async () => {
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

  const onGetBooks = jest.fn(() => ({
    '1984': { title: '1984', author: link('/users/orwell') },
    '2001': { title: '2001', author: link('/users/clarke') },
  }));

  const onGetUsers = jest.fn(() => ({
    orwell: { name: 'George Orwell' },
    clarke: { name: 'Arthur C Clarke' },
  }));

  store.onGet('/books', onGetBooks);
  store.onGet('/users', onGetUsers);

  const result = await store.get('/books', [
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

  expect(onGetBooks).toHaveBeenCalledWith(
    expectedBooksQuery,
    expect.any(Object),
  );
  expect(onGetUsers).toHaveBeenCalledWith(
    expectedUsersQuery,
    expect.any(Object),
  );
  expect(result.pageInfo).toEqual(expectedResult.pageInfo);
  expect(result).toEqual(expectedResult);
});

const forever = new Promise(() => {});

test('Porcelain sub', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const onSubBooks = async function* onSubBooks() {
    yield {
      '1984': { title: '1984', author: link('/users/orwell') },
      '2001': { title: '2001', author: link('/users/clarke') },
    };
    await forever;
  };

  const onSubUsers = async function* onSubUsers() {
    yield {
      orwell: { name: 'George Orwell' },
      clarke: { name: 'Arthur C Clarke' },
    };
    await forever;
  };

  store.onSub('/books', onSubBooks);
  store.onSub('/users', onSubUsers);

  const result = store.sub('/books', [
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
