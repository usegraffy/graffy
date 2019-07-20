import decorate from '../decorate';

test('decorate', () => {
  const decorated = decorate(
    /* prettier-ignore */
    [
      { key: 'users', clock: 2, children: [
        { key: '1', clock: 2, children: [
          { key: 'name', value: 'George Orwell', clock: 2 },
        ] },
        { key: '2', clock: 2, children: [
          { key: 'name', value: 'Arthur C Clarke', clock: 2 },
        ]}
      ] },
      { key: 'posts', clock: 2, children: [
        { key: '1984', clock: 2, children: [
          { key: 'author', clock: 2, path: ['users', '1'] },
          { key: 'body', value: 'Lorem ipsum', clock: 2 },
          { key: 'title', value: '1984', clock: 2 },
        ] },
        { key: '1984\0', end: '2000\uffff', clock: 2},
        { key: '2001', clock: 2, children: [
          { key: 'author', clock: 2, path: ['users', '2'] },
          { key: 'body', value: 'Hello world', clock: 2 },
          { key: 'title', value: '2001', clock: 2 },
        ] },
        { key: '2001\0', end: '\uffff', clock: 2 }
      ] },
    ],
  );
  expect(decorated).toEqual({
    users: {
      1: { name: 'George Orwell' },
      2: { name: 'Arthur C Clarke' },
    },
    posts: [
      {
        title: '1984',
        body: 'Lorem ipsum',
        author: { name: 'George Orwell' },
      },
      {
        title: '2001',
        body: 'Hello world',
        author: { name: 'Arthur C Clarke' },
      },
    ],
  });

  expect(decorated.posts[0].author).toBe(decorated.users['1']);
  expect(decorated.posts[1].author).toBe(decorated.users['2']);
});

// TODO: Test multi-hop links and loops.
