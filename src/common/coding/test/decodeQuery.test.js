import { decodeQuery } from '../decodeTree.js';
import { encodeValue as key } from '../../index.js';

it('should decodeGraph queries', () => {
  const decodedGraph = decodeQuery(
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
  );

  expect(decodedGraph).toEqual({
    postCount: true,
    posts: [
      {
        $key: { $first: 10, $since: '1984' },
        title: true,
        body: true,
        author: { name: true },
      },
    ],
    tags: [{ $key: { $first: 10 } }],
  });
});

test('rangeRef', () => {
  const result = decodeQuery([
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
  // console.log(JSON.stringify(result));
  expect(result).toEqual({ foo: [{ $key: { $all: true, tag: 'x' } }] });
});
