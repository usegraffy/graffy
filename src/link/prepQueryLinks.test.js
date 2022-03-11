import { encodeQuery } from '@graffy/common';
import prepQueryLinks from './prepQueryLinks.js';

test('prepQueryLinks', () => {
  const query = encodeQuery(
    {
      members: {
        a: { person: { name: true }, role: true },
        b: { person: { name: true } },
        c: { person: { name: true } },
      },
    },
    0,
  );

  const defs = [
    {
      path: ['members', '$pid', 'person'],
      def: ['persons', '$$members.$pid.personId'],
    },
    {
      path: ['members', '$pid', 'unused'],
      def: ['something'],
    },
  ];

  const usedDefs = prepQueryLinks(query, defs);

  expect(query).toEqual(
    encodeQuery(
      {
        members: {
          a: { personId: true, role: true },
          b: { personId: true },
          c: { personId: true },
        },
      },
      0,
    ),
  );

  expect(usedDefs).toEqual([
    {
      path: ['members', 'a', 'person'],
      def: ['persons', '$$members.a.personId'],
    },
    {
      path: ['members', 'b', 'person'],
      def: ['persons', '$$members.b.personId'],
    },
    {
      path: ['members', 'c', 'person'],
      def: ['persons', '$$members.c.personId'],
    },
  ]);
});

test('parallelLookups', () => {
  const defs = [
    {
      path: ['foo', 'bars', '$i'],
      def: ['bar', '$$foo.barIds.$i'],
    },
  ];

  const query = encodeQuery({
    foo: {
      bars: {
        $key: { $first: 10 },
        prop: true,
      },
    },
  });

  const usedDefs = prepQueryLinks(query, defs);

  expect(query).toEqual(
    encodeQuery({
      foo: {
        barIds: { $key: { $first: 10 } },
      },
    }),
  );

  expect(usedDefs).toEqual([
    {
      path: ['foo', 'bars', '$i'],
      def: ['bar', '$$foo.barIds.$i'],
    },
  ]);
});

test('cube_args', () => {
  /*
  $id.prospect’: [
                ‘prospect’,
                { tenantId: ‘$$$id.tenantId’, $all: true },
            ],
  */
  const defs = [
    {
      path: ['foo', '$id', 'prospect'],
      def: ['prospect', { tenantId: '$$$id.tenantId', $all: true }],
    },
  ];

  const quantities = {
    $ctd: [
      [-Infinity, -Infinity],
      [Infinity, Infinity],
    ],
  };

  const query = encodeQuery({
    foo: {
      abc: {
        prospect: {
          $key: { quantities },
          name: true,
        },
      },
    },
  });

  const usedDefs = prepQueryLinks(query, defs);
  expect(usedDefs[0].def[1].quantities).toEqual(quantities);
});
