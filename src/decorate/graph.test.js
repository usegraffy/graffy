import { graph, page, link } from '.';

it('should encode graphs', () => {
  expect(
    graph(
      {
        postCount: 25,
        posts: page(
          {
            '1984': {
              title: '1984',
              body: 'Lorem ipsum',
              author: link(['users', '1']),
            },
            '2001': {
              title: '2001',
              body: 'Hello world',
              author: link(['users', '2']),
            },
          },
          '1984',
        ),
      },
      2,
    ),
  ).toEqual(
    /* prettier-ignore */
    [
      { key: 'postCount', value: 25, clock: 2 },
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
});
