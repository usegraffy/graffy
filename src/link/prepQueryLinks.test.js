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
      path: ['members', '$pid', 'person'],
      def: ['persons', '$$members.$pid.personId'],
    },
  ]);
});
