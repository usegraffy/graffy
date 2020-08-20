import makeGraph from '../graph.js';

test('simple', () => {
  const users = [
    { _key_: '1', name: 'Alice', settings: { _val_: ['hi'] } },
    { _key_: '2', name: 'Bob', manager: { _ref_: 'users.1' }, foo: null },
  ];

  const posts = [];
  const tags = { a: true, b: true };
  const version = 0;

  expect(makeGraph({ users, posts, tags }, version)).toEqual([
    {
      key: 'tags',
      version,
      children: [
        { key: 'a', value: true, version },
        { key: 'b', value: true, version },
      ],
    },
    {
      key: 'users',
      version,
      children: [
        {
          key: '1',
          version,
          children: [
            { key: 'name', value: 'Alice', version },
            { key: 'settings', value: ['hi'], version },
          ],
        },
        {
          key: '2',
          version,
          children: [
            { key: 'foo', end: 'foo', version },
            { key: 'manager', path: ['users', '1'], version },
            { key: 'name', value: 'Bob', version },
          ],
        },
      ],
    },
  ]);
});

test('point_deletion', () => {
  const version = 0;
  expect(
    makeGraph(
      {
        foo: null,
      },
      version,
    ),
  ).toEqual([{ key: 'foo', end: 'foo', version }]);
});

test('point_in_range_deletion', () => {
  const version = 0;
  expect(
    makeGraph(
      [
        {
          _key_: { cursor: ['foo'] },
        },
      ],
      version,
    ),
  ).toEqual([{ key: '\0' + '0VKaQqw', end: '\0' + '0VKaQqw', version }]);
});

test('range', () => {
  expect(makeGraph([{ _key_: { before: ['a'] } }], 0)).toEqual([
    {
      key: '\0',
      end: '\x000VKV\uffff',
      version: 0,
    },
  ]);
});

// import { graph, page, link, scalar } from '../graph';
// import { encodeValue as key } from '../../encode';
// import { keyAfter, keyBefore } from '../../graph';
//
// it('should encode graphs', () => {
//   expect(
//     graph(
//       {
//         postCount: 25,
//         posts: page(
//           {
//             ['\0' + key('1984')]: {
//               title: '1984',
//               body: 'Lorem ipsum',
//               author: link(['users', '1']),
//               options: scalar({ inStock: true }),
//             },
//             ['\0' + key('2001')]: {
//               title: '2001',
//               body: 'Hello world',
//               author: link(['users', '2']),
//               options: scalar({ borrowed: true }),
//             },
//           },
//           '\0' + key('1984'),
//         ),
//         posts$: [
//           { key: { cursor: [8483, '2001'] }, path: ['posts', '2001'] },
//           { key: { cursor: [4563, '1984'] }, path: ['posts', '1984'] },
//         ],
//       },
//       2,
//     ),
//   ).toEqual(
//     /* prettier-ignore */
//     [
//       { key: 'postCount', value: 25, version: 2 },
//       { key: 'posts', version: 2, children: [
//         { key: '\0' + key('1984'), version: 2, children: [
//           { key: 'author', version: 2, path: ['users', '1'] },
//           { key: 'body', value: 'Lorem ipsum', version: 2 },
//           { key: 'options', value: { inStock: true }, version: 2 },
//           { key: 'title', value: '1984', version: 2 },
//         ] },
//         {
//           key: '\0' + keyAfter(key('1984')),
//           end: '\0' + keyBefore(key('2001')),
//           version: 2
//         },
//         { key: '\0' + key('2001'), version: 2, children: [
//           { key: 'author', version: 2, path: ['users', '2'] },
//           { key: 'body', value: 'Hello world', version: 2 },
//           { key: 'options', value: { borrowed: true }, version: 2 },
//           { key: 'title', value: '2001', version: 2 },
//         ] },
//         { key: '\0' + keyAfter(key('2001')), end: '\0\uffff', version: 2 }
//       ] },
//       { key: 'posts$', version: 2, children: [
//         { key: '\0' + key([4563, '1984']), version: 2, path: ['posts', '1984'] },
//         { key: '\0' + key([8483, '2001']), version: 2, path: ['posts', '2001'] },
//       ] }
//     ],
//   );
// });
