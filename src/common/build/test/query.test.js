import makeQuery from '../query.js';

it('should encode queries', () => {
  expect(
    makeQuery(
      {
        postCount: 1,
        posts: {
          _key_: { first: 10, since: '1984' },
          title: 1,
          body: 1,
          author: { name: 1 },
        },
        tags: { _key_: { first: 10 } },
        reactions: { _key_: { last: 100 } },
      },
      2,
    ),
  ).toEqual(
    /* prettier-ignore */
    [
      { key: 'postCount', value: 1, version: 2 },
      { key: 'posts', version: 2, children: [
        { key: '1984', end: '\uffff', limit: 10, version: 2, children: [
          { key: 'author', version: 2, children: [
            { key: 'name', value: 1, version: 2 }
          ] },
          { key: 'body', value: 1, version: 2 },
          { key: 'title', value: 1, version: 2 },
        ] },
      ] },
      { key: 'reactions', version: 2, children: [
        { end: '', key: '\uffff', limit: 100, version: 2, value: 1 }
      ] },
      { key: 'tags', version: 2, children: [
        { key: '', end: '\uffff', limit: 10, version: 2, value: 1 }
      ] }
    ],
  );
});
