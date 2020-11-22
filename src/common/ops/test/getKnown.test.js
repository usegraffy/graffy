import getKnown from '../getKnown';

test('getKnown', () => {
  expect(
    getKnown([
      {
        key: 'foo',
        children: [
          { key: 'bar', value: 255, version: 3 },
          { key: 'bat', end: 'baw', version: 3 },
          { key: 'baz', end: 'baz', version: 4 },
        ],
        version: 0,
      },
    ]),
  ).toEqual([
    {
      key: 'foo',
      children: [
        { key: 'bar', value: 1, version: 0 },
        {
          key: 'bat',
          end: 'baw',
          value: 1,
          version: 0,
          options: { subtree: true },
        },
        { key: 'baz', value: 1, version: 0, options: { subtree: true } },
      ],
      version: 0,
    },
  ]);
});
