import { e } from '@graffy/testing/encoder.js';
import { MAX_KEY, MIN_KEY } from '../../util.js';
import merge from '../merge.js';
import { keyAfter as aft, keyBefore as bef } from '../step.js';

describe('merge', () => {
  test('stayEmpty', () => {
    const original = [];
    merge(original, []);
    expect(original).toEqual([]);
  });

  test('addLeafToEmpty', () => {
    const original = [];
    merge(original, [{ key: e.foo, value: 42, version: 3 }]);
    expect(original).toEqual([{ key: e.foo, value: 42, version: 3 }]);
  });

  test('updateLeafNewer', () => {
    const original = [{ key: e.foo, value: 41, version: 2 }];
    merge(original, [{ key: e.foo, value: 42, version: 3 }]);
    expect(original).toEqual([{ key: e.foo, value: 42, version: 3 }]);
  });

  test('updateLeafOlder', () => {
    const original = [{ key: e.foo, value: 41, version: 3 }];
    merge(original, [{ key: e.foo, value: 42, version: 2 }]);
    expect(original).toEqual([{ key: e.foo, value: 41, version: 3 }]);
  });
});

describe('branches', () => {
  test('updateBranchWithBranch', () => {
    const original = [
      {
        key: e.foo,
        children: [
          { key: e.bar, value: 10, version: 2 },
          { key: e.bat, value: 15, version: 2 },
          { key: e.baz, value: 20, version: 2 },
        ],
      },
    ];
    merge(original, [
      {
        key: e.foo,
        children: [
          { key: e.bar, value: 8, version: 1 },
          { key: e.baz, value: 25, version: 3 },
          { key: e.cat, value: 3, version: 2 },
        ],
      },
    ]);
    expect(original).toEqual([
      {
        key: e.foo,
        children: [
          { key: e.bar, value: 10, version: 2 },
          { key: e.bat, value: 15, version: 2 },
          { key: e.baz, value: 25, version: 3 },
          { key: e.cat, value: 3, version: 2 },
        ],
      },
    ]);
  });

  test('updateLeafWithNewerBranch', () => {
    const original = [{ key: e.foo, value: 10, version: 2 }];
    merge(original, [
      {
        key: e.foo,
        children: [
          { key: e.bar, value: 8, version: 1 },
          { key: e.baz, value: 25, version: 3 },
          { key: e.cat, value: 3, version: 1 },
        ],
      },
    ]);
    expect(original).toEqual([
      {
        key: e.foo,
        children: [
          { key: MIN_KEY, end: bef(e.baz), version: 2 },
          { key: e.baz, value: 25, version: 3 },
          { key: aft(e.baz), end: MAX_KEY, version: 2 },
        ],
      },
    ]);
  });

  test('updateLeafWithOlderBranch', () => {
    const original = [{ key: e.foo, value: 10, version: 2 }];
    merge(original, [
      {
        key: e.foo,
        children: [
          { key: e.bar, value: 8, version: 1 },
          { key: e.cat, value: 3, version: 1 },
        ],
      },
    ]);
    expect(original).toEqual([{ key: e.foo, value: 10, version: 2 }]);
  });

  test('updateBranchWithOlderLeaf', () => {
    const original = [
      {
        key: e.foo,
        children: [
          { key: e.bar, value: 8, version: 1 },
          { key: e.baz, value: 25, version: 3 },
          { key: e.cat, value: 3, version: 1 },
        ],
      },
    ];
    merge(original, [{ key: e.foo, value: 10, version: 2 }]);
    expect(original).toEqual([
      {
        key: e.foo,
        children: [
          { key: MIN_KEY, end: bef(e.baz), version: 2 },
          { key: e.baz, value: 25, version: 3 },
          { key: aft(e.baz), end: MAX_KEY, version: 2 },
        ],
      },
    ]);
  });

  test('updateBranchWithNewerLeaf', () => {
    const original = [
      {
        key: e.foo,
        children: [
          { key: e.bar, value: 8, version: 1 },
          { key: e.cat, value: 3, version: 2 },
        ],
      },
    ];
    merge(original, [{ key: e.foo, value: 10, version: 3 }]);
    expect(original).toEqual([{ key: e.foo, value: 10, version: 3 }]);
  });
});

describe('addToGap', () => {
  test('addLeafToGapStart', () => {
    const original = [{ key: e.foo, value: 41, version: 2 }];
    merge(original, [{ key: e.bar, value: 42, version: 3 }]);
    expect(original).toEqual([
      { key: e.bar, value: 42, version: 3 },
      { key: e.foo, value: 41, version: 2 },
    ]);
  });

  test('addLeafToGapEnd', () => {
    const original = [{ key: e.foo, value: 41, version: 2 }];
    merge(original, [{ key: e.zop, value: 42, version: 3 }]);
    expect(original).toEqual([
      { key: e.foo, value: 41, version: 2 },
      { key: e.zop, value: 42, version: 3 },
    ]);
  });

  test('addLeafToGapMiddle', () => {
    const original = [
      { key: e.bar, value: 42, version: 3 },
      { key: e.foo, value: 41, version: 2 },
    ];
    merge(original, [{ key: e.baz, value: 40, version: 3 }]);
    expect(original).toEqual([
      { key: e.bar, value: 42, version: 3 },
      { key: e.baz, value: 40, version: 3 },
      { key: e.foo, value: 41, version: 2 },
    ]);
  });
});

describe('addToRange', () => {
  test('addNewLeafToRangeStart', () => {
    const original = [{ key: e.foo, end: e.gah, version: 2 }];
    merge(original, [{ key: e.foo, value: 42, version: 3 }]);
    expect(original).toEqual([
      { key: e.foo, value: 42, version: 3 },
      { key: aft(e.foo), end: e.gah, version: 2 },
    ]);
  });

  test('addNewLeafToRangeEnd', () => {
    const original = [{ key: e.foo, end: e.gah, version: 2 }];
    merge(original, [{ key: e.gah, value: 42, version: 3 }]);
    expect(original).toEqual([
      { key: e.foo, end: bef(e.gah), version: 2 },
      { key: e.gah, value: 42, version: 3 },
    ]);
  });

  test('addNewLeafToRangeMiddle', () => {
    const original = [{ key: e.foo, end: e.gah, version: 2 }];
    merge(original, [{ key: e.fuz, value: 42, version: 3 }]);
    expect(original).toEqual([
      { key: e.foo, end: bef(e.fuz), version: 2 },
      { key: e.fuz, value: 42, version: 3 },
      { key: aft(e.fuz), end: e.gah, version: 2 },
    ]);
  });

  test('addOldLeafToRangeStart', () => {
    const original = [{ key: e.foo, end: e.gah, version: 3 }];
    merge(original, [{ key: e.foo, value: 42, version: 2 }]);
    expect(original).toEqual([{ key: e.foo, end: e.gah, version: 3 }]);
  });

  test('addOldLeafToRangeEnd', () => {
    const original = [{ key: e.foo, end: e.gah, version: 3 }];
    merge(original, [{ key: e.gah, value: 42, version: 2 }]);
    expect(original).toEqual([{ key: e.foo, end: e.gah, version: 3 }]);
  });

  test('addOldLeafToRangeMiddle', () => {
    const original = [{ key: e.foo, end: e.gah, version: 3 }];
    merge(original, [{ key: e.fuz, value: 42, version: 2 }]);
    expect(original).toEqual([{ key: e.foo, end: e.gah, version: 3 }]);
  });

  test('addBranchToRange', () => {
    const original = [{ key: e.foo, end: e.gah, version: 2 }];
    merge(original, [
      {
        key: e.fuz,
        children: [
          { key: e.bar, value: 8, version: 1 },
          { key: e.baz, value: 25, version: 3 },
          { key: e.cat, value: 3, version: 1 },
        ],
      },
    ]);
    expect(original).toEqual([
      { key: e.foo, end: bef(e.fuz), version: 2 },
      {
        key: e.fuz,
        children: [
          { key: MIN_KEY, end: bef(e.baz), version: 2 },
          { key: e.baz, value: 25, version: 3 },
          { key: aft(e.baz), end: MAX_KEY, version: 2 },
        ],
      },
      { key: aft(e.fuz), end: e.gah, version: 2 },
    ]);
  });
});

describe('addRange', () => {
  test('addRange', () => {
    const original = [
      { key: e.bar, end: bef(e.fot), version: 2 },
      { key: e.fot, value: 42, version: 2 },
      {
        key: e.foz,
        children: [
          { key: e.bar, value: 8, version: 1 },
          { key: e.cat, value: 3, version: 2 },
        ],
      },
      {
        key: e.fuz,
        children: [
          { key: e.bar, value: 8, version: 1 },
          { key: e.baz, value: 25, version: 4 },
          { key: e.cat, value: 3, version: 2 },
        ],
      },
      { key: e.gah, value: 42, version: 4 },
      { key: e.hey, value: 2, version: 1 },
    ];
    merge(original, [{ key: e.foo, end: e.gah, version: 3 }]);
    expect(original).toEqual([
      { key: e.bar, end: bef(e.foo), version: 2 },
      { key: e.foo, end: bef(e.fuz), version: 3 },
      {
        key: e.fuz,
        children: [
          { key: MIN_KEY, end: bef(e.baz), version: 3 },
          { key: e.baz, value: 25, version: 4 },
          { key: aft(e.baz), end: MAX_KEY, version: 3 },
        ],
      },
      { key: aft(e.fuz), end: bef(e.gah), version: 3 },
      { key: e.gah, value: 42, version: 4 },
      { key: e.hey, value: 2, version: 1 },
    ]);
  });
});

test('fillEmpty', () => {
  const original = [{ key: MIN_KEY, end: MAX_KEY, version: 0 }];
  expect(
    merge(original, [
      {
        key: e.foo,
        children: [{ key: e.bar, value: 33, version: 0 }],
        version: 0,
      },
    ]),
  ).toEqual([
    { key: MIN_KEY, end: bef(e.foo), version: 0 },
    {
      key: e.foo,
      children: [
        { key: MIN_KEY, end: bef(e.bar), version: 0 },
        { key: e.bar, value: 33, version: 0 },
        { key: aft(e.bar), end: MAX_KEY, version: 0 },
      ],
      version: 0,
    },
    { key: aft(e.foo), end: MAX_KEY, version: 0 },
  ]);
});

test('prefixFill', () => {
  const original = [{ key: MIN_KEY, end: MAX_KEY, version: 0 }];
  expect(
    merge(original, [
      {
        key: e.abc,
        children: [
          {
            key: e.def,
            path: [e.foo],
            version: 0,
          },
        ],
        version: 0,
        prefix: true,
      },
      {
        key: e.foo,
        children: [{ key: e.bar, value: 33, version: 0 }],
        version: 0,
      },
    ]),
  ).toEqual([
    { key: MIN_KEY, end: bef(e.abc), version: 0 },
    {
      key: e.abc,
      children: [
        { key: MIN_KEY, end: bef(e.def), version: 0 },
        {
          key: e.def,
          path: [e.foo],
          version: 0,
        },
        { key: aft(e.def), end: MAX_KEY, version: 0 },
      ],
      version: 0,
      prefix: true,
    },
    { key: aft(e.abc), end: bef(e.foo), version: 0 },
    {
      key: e.foo,
      children: [
        { key: MIN_KEY, end: bef(e.bar), version: 0 },
        { key: e.bar, value: 33, version: 0 },
        { key: aft(e.bar), end: MAX_KEY, version: 0 },
      ],
      version: 0,
    },
    { key: aft(e.foo), end: MAX_KEY, version: 0 },
  ]);
});

// describe('errors', () => {
//   test('versionCollisionError', () => {
//     expect(() =>
//       merge(
//         [{ key: e.foo, value: 41, version: 2 }],
//         [{ key: e.foo, value: 42, version: 2 }],
//       ),
//     ).toThrow();
//   });
// });
