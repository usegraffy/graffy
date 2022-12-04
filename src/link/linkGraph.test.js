import { encodeGraph, MIN_KEY } from '../common/index.js';
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

test('compat', () => {
  const graph = encodeGraph(
    {
      post: {
        p1: {
          authors: [{ id: 'bob' }],
          category: 'cooking',
        },
        bob: {
          authors: [{ id: 'ali' }, { id: 'carl' }],
          category: 'fitness',
        },
      },
    },
    0,
  );

  const defs = [
    {
      path: ['post', '$i', 'authors', '$j', 'tagline'],
      def: [
        'user',
        '$$post.$i.authors.$j.id',
        'taglines',
        '$$post.$i.category',
      ],
    },
  ];

  expect(linkGraph(graph, defs)).toEqual(
    encodeGraph(
      {
        post: {
          p1: {
            authors: [
              {
                id: 'bob',
                tagline: { $ref: ['user', 'bob', 'taglines', 'cooking'] },
              },
            ],
            category: 'cooking',
          },
          bob: {
            authors: [
              {
                id: 'ali',
                tagline: { $ref: ['user', 'ali', 'taglines', 'fitness'] },
              },
              {
                id: 'carl',
                tagline: { $ref: ['user', 'carl', 'taglines', 'fitness'] },
              },
            ],
            category: 'fitness',
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
      path: ['person', 'abcdef', 'prospect', MIN_KEY],
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

test('gate_pattern', () => {
  const defs = [
    {
      path: ['abcdef', 'prospect', { foo: { $cts: { bar: {} } } }],
      def: [
        'prospect',
        {
          tenantId: '$$abcdef.tenantId',
          foo: { $cts: { bar: {} } },
          $all: true,
        },
      ],
    },
  ];
  const graph = encodeGraph({ abcdef: { tenantId: 'xyz' } }, 0);
  const res = linkGraph(graph, defs);

  expect(res).toEqual(
    encodeGraph(
      {
        abcdef: {
          tenantId: 'xyz',
          prospect: [
            {
              $key: { $all: true, foo: { $cts: { bar: {} } } },
              $ref: [
                'prospect',
                { foo: { $cts: { bar: {} } }, tenantId: 'xyz' },
              ],
            },
          ],
        },
      },
      0,
    ),
  );
});
