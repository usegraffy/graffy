import { encodeQuery } from '../encodeTree.js';

it('should encode queries', () => {
  expect(
    encodeQuery(
      {
        postCount: 1,
        posts: {
          $key: { $first: 10, $since: '1984' },
          title: 1,
          body: 1,
          author: { name: 1 },
        },
        tags: { $key: { $first: 10 } },
        reactions: { $key: { $last: 100 } },
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

test('rangeRef', () => {
  const result = encodeQuery({ foo: [{ $key: { $all: true, tag: 'x' } }] }, 0);
  // console.log(JSON.stringify(result));
  expect(result).toEqual([
    {
      key: 'foo',
      version: 0,
      children: [
        {
          key: '\u00000kKoNLR-0MV',
          version: 0,
          prefix: true,
          children: [{ key: '', end: '\uffff', value: 1, version: 0 }],
        },
      ],
    },
  ]);
});
