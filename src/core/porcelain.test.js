import Graffy from './Graffy';
import GraffyFill from '@graffy/fill';
import { link } from '@graffy/common';

process.on('unhandledRejection', reason => {
  console.error('unhandledRejection', reason);
});

test('Porcelain get', async () => {
  const store = new Graffy();
  store.use(GraffyFill());

  const expectedBooksQuery = /* prettier-ignore */ [
    { key: '', end: '\uffff', count: 2, version: 0, children: [
      { key: 'author', version: 0, children: [
        { key: 'name', version: 0, value: 1 }
      ] },
      { key: 'title', version: 0, value: 1 },
    ] }
  ];

  const expectedUsersQuery = /* prettier-ignore */ [
    { key: 'clarke', children: [
      { key: 'name', version: 0, value: 1 }
    ], version: 0 },
    { key: 'orwell', children: [
      { key: 'name', version: 0, value: 1 }
    ], version: 0 },
  ];

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
