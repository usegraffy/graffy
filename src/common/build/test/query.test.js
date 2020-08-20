import makeQuery from '../query.js';
import { encodeValue as key } from '../../encode/index.js';

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
        reactions: { _key_: {} },
      },
      2,
    ),
  ).toEqual(
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
      { key: 'reactions', version: 2, children: [
        { key: '\0', end: '\0\uffff', version: 2, value: 1 }
      ] },
      { key: 'tags', version: 2, children: [
        { key: '\0', end: '\0\uffff', limit: 10, version: 2, value: 1 }
      ] }
    ],
  );
});

test('makeRange', () => {
  const query = makeQuery({ foo: { _key_: { first: 3 } } });
  console.log(query[0].children, format(query));
});

// import { query } from '../query';
// import { encodeValue as key } from '../../encode';
//
// it('should encode queries', () => {
//   expect(
//     query(
//       {
//         postCount: 1,
//         posts: [
//           { first: 10, since: '1984' },
//           { title: 1, body: 1, author: { name: 1 } },
//         ],
//         tags: [{ first: 10 }, true],
//         reactions: [true],
//       },
//       2,
//     ),
//   ).toEqual(
//     /* prettier-ignore */
//     [
//       { key: 'postCount', value: 1, version: 2 },
//       { key: 'posts', version: 2, children: [
//         { key: '\0' + key('1984'), end: '\0\uffff', limit: 10, version: 2, children: [
//           { key: 'author', version: 2, children: [
//             { key: 'name', value: 1, version: 2 }
//           ] },
//           { key: 'body', value: 1, version: 2 },
//           { key: 'title', value: 1, version: 2 },
//         ] },
//       ] },
//       { key: 'reactions', version: 2, children: [
//         { key: '\0', end: '\0\uffff', version: 2, value: 1 }
//       ] },
//       { key: 'tags', version: 2, children: [
//         { key: '\0', end: '\0\uffff', limit: 10, version: 2, value: 1 }
//       ] }
//     ],
//   );
// });
