import decorateQuery from '../decorateQuery';
import { encodeValue as key } from '../../encode';

it('should decorate queries', () => {
  expect(
    decorateQuery(
      /* prettier-ignore */
      [
        { key: 'postCount', value: 1, version: 2 },
        { key: 'posts', version: 2, children: [
          { key: '\0' + key('1984'), end: '\0\uffff', limit: 10, version: 2, children: [
            { key: 'author', version: 2, children: [
              { key: 'name', value: 1, version: 2 }
            ] },
            { key: 'body', value: 1, version: 2 },
            { key: 'title', value: 1, version: 2 },
          ] },
        ] },
        { key: 'tags', version: 2, children: [
          { key: '\0', end: '\0\uffff', limit: 10, version: 2, value: 1 }
        ] }
      ],
    ),
  ).toEqual({
    postCount: true,
    posts: [
      { first: 10, since: '1984' },
      { title: true, body: true, author: { name: true } },
    ],
    tags: [{ first: 10 }, true],
  });
});
