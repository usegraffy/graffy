import { query } from '../query';
import { key } from '../../encode';

it('should encode queries', () => {
  expect(
    query(
      {
        postCount: 1,
        posts: [
          { first: 10, after: '1984' },
          { title: 1, body: 1, author: { name: 1 } },
        ],
        tags: [{ first: 10 }, true],
        reactions: [true],
      },
      2,
    ),
  ).toEqual(
    /* prettier-ignore */
    [
      { key: 'postCount', value: 1, version: 2 },
      { key: 'posts', version: 2, children: [
        { key: key('1984'), end: '\uffff', count: 10, version: 2, children: [
          { key: 'author', version: 2, children: [
            { key: 'name', value: 1, version: 2 }
          ] },
          { key: 'body', value: 1, version: 2 },
          { key: 'title', value: 1, version: 2 },
        ] },
      ] },
      { key: 'reactions', version: 2, children: [
        { key: '', end: '\uffff', count: 4096, version: 2, value: 1 }
      ] },
      { key: 'tags', version: 2, children: [
        { key: '', end: '\uffff', count: 10, version: 2, value: 1 }
      ] }
    ],
  );
});
