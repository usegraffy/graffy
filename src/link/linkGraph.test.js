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

test('placeholder_in_key', () => {
  const defs = [
    {
      path: ['person', 'abcdef', 'prospect', ''],
      def: [
        'prospect',
        { $all: true, persons: { '$$person.abcdef.id': true } },
      ],
    },
  ];

  const graph = encodeGraph({ person: { abcdef: { id: 'abcdef' } } }, 0);
  const res = linkGraph(graph, defs);

  expect(res).toEqual(
    encodeGraph(
      {
        person: {
          abcdef: {
            id: 'abcdef',
            prospect: [
              {
                $key: { $all: true },
                $ref: ['prospect', { persons: { abcdef: true } }],
              },
            ],
          },
        },
      },
      0,
    ),
  );
});
