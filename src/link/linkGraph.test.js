import { encodeGraph } from '../common/index.js';
import linkGraph from './linkGraph.js';

test('simple', () => {
  const graph = encodeGraph(
    {
      user: {
        bob: {
          friendIds: ['ali', 'carl'],
        },
      },
    },
    0,
  );

  const defs = [
    {
      path: ['user', '$i', 'friends', '$j'],
      def: ['user', '$$user.$i.friendIds.$j'],
    },
  ];
  expect(linkGraph(graph, defs)).toEqual(
    encodeGraph(
      {
        user: {
          bob: {
            friendIds: ['ali', 'carl'],
            friends: [
              { $key: 0, $ref: ['user', 'ali'] },
              { $key: 1, $ref: ['user', 'carl'] },
            ],
          },
        },
      },
      0,
    ),
  );
});

test.skip('complex', () => {
  const graph = encodeGraph(
    {
      foo: [
        { $key: 'two', x: 30 },
        { $key: 'three', x: 33 },
      ],
    },
    0,
  );

  const defs = [
    {
      path: ['bar', '$n', 'x'],
      def: ['baz', '$$foo.$n.x', { number: '$n', $all: true }],
    },
  ];
  expect(linkGraph(graph, defs)).toEqual(
    encodeGraph(
      {
        foo: [
          { $key: 'two', x: 30 },
          { $key: 'three', x: 33 },
        ],
        bar: [
          {
            $key: 'two',
            x: { $ref: ['baz', 30, { number: 'two', $all: true }] },
          },
          {
            $key: 'three',
            x: { $ref: ['baz', 33, { number: 'three', $all: true }] },
          },
        ],
      },
      0,
    ),
  );
});
