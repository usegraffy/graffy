import { query } from '.';

it('should encode queries', () => {
  expect(
    query(
      {
        postCount: 1,
        posts: [
          { first: 10, after: '1984' },
          { title: 1, body: 1, author: { name: 1 } },
        ],
        tags: [{ first: 10 }],
      },
      2,
    ),
  ).toEqual(
    /* prettier-ignore */
    [
      { key: 'postCount', sum: 1, clock: 2 },
      { key: 'posts', clock: 2, children: [
        { key: '1984', end: '\uffff', count: 10, clock: 2, children: [
          { key: 'author', clock: 2, children: [
            { key: 'name', sum: 1, clock: 2 }
          ] },
          { key: 'body', sum: 1, clock: 2 },
          { key: 'title', sum: 1, clock: 2 },
        ] },
      ] },
      { key: 'tags', clock: 2, children: [
        { key: '', end: '\uffff', count: 10, clock: 2, sum: 1 }
      ] }
    ],
  );
});
