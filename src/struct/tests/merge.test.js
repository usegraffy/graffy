import merge from '../merge';

describe('merge', () => {
  test('stayEmpty', () => {
    const original = [];
    merge(original, []);
    expect(original).toEqual([]);
  });

  test('addLeafToEmpty', () => {
    const original = [];
    merge(original, [{ key: 'foo', value: 42, clock: 3 }]);
    expect(original).toEqual([{ key: 'foo', value: 42, clock: 3 }]);
  });

  test('updateLeafNewer', () => {
    const original = [{ key: 'foo', value: 41, clock: 2 }];
    merge(original, [{ key: 'foo', value: 42, clock: 3 }]);
    expect(original).toEqual([{ key: 'foo', value: 42, clock: 3 }]);
  });

  test('updateLeafOlder', () => {
    const original = [{ key: 'foo', value: 41, clock: 3 }];
    merge(original, [{ key: 'foo', value: 42, clock: 2 }]);
    expect(original).toEqual([{ key: 'foo', value: 41, clock: 3 }]);
  });
});

describe('branches', () => {
  test('updateBranchWithBranch', () => {
    const original = [
      {
        key: 'foo',
        children: [
          { key: 'bar', value: 10, clock: 2 },
          { key: 'bat', value: 15, clock: 2 },
          { key: 'baz', value: 20, clock: 2 },
        ],
      },
    ];
    merge(original, [
      {
        key: 'foo',
        children: [
          { key: 'bar', value: 8, clock: 1 },
          { key: 'baz', value: 25, clock: 3 },
          { key: 'cat', value: 3, clock: 2 },
        ],
      },
    ]);
    expect(original).toEqual([
      {
        key: 'foo',
        children: [
          { key: 'bar', value: 10, clock: 2 },
          { key: 'bat', value: 15, clock: 2 },
          { key: 'baz', value: 25, clock: 3 },
          { key: 'cat', value: 3, clock: 2 },
        ],
      },
    ]);
  });

  test('updateLeafWithNewerBranch', () => {
    const original = [{ key: 'foo', value: 10, clock: 2 }];
    merge(original, [
      {
        key: 'foo',
        children: [
          { key: 'bar', value: 8, clock: 1 },
          { key: 'baz', value: 25, clock: 3 },
          { key: 'cat', value: 3, clock: 1 },
        ],
      },
    ]);
    expect(original).toEqual([
      {
        key: 'foo',
        children: [{ key: 'baz', value: 25, clock: 3 }],
      },
    ]);
  });

  test('updateLeafWithOlderBranch', () => {
    const original = [{ key: 'foo', value: 10, clock: 2 }];
    merge(original, [
      {
        key: 'foo',
        children: [
          { key: 'bar', value: 8, clock: 1 },
          { key: 'cat', value: 3, clock: 1 },
        ],
      },
    ]);
    expect(original).toEqual([{ key: 'foo', value: 10, clock: 2 }]);
  });

  test('updateBranchWithOlderLeaf', () => {
    const original = [
      {
        key: 'foo',
        children: [
          { key: 'bar', value: 8, clock: 1 },
          { key: 'baz', value: 25, clock: 3 },
          { key: 'cat', value: 3, clock: 1 },
        ],
      },
    ];
    merge(original, [{ key: 'foo', value: 10, clock: 2 }]);
    expect(original).toEqual([
      {
        key: 'foo',
        children: [{ key: 'baz', value: 25, clock: 3 }],
      },
    ]);
  });

  test('updateBranchWithNewerLeaf', () => {
    const original = [
      {
        key: 'foo',
        children: [
          { key: 'bar', value: 8, clock: 1 },
          { key: 'cat', value: 3, clock: 2 },
        ],
      },
    ];
    merge(original, [{ key: 'foo', value: 10, clock: 3 }]);
    expect(original).toEqual([{ key: 'foo', value: 10, clock: 3 }]);
  });
});

describe('addToGap', () => {
  test('addLeafToGapStart', () => {
    const original = [{ key: 'foo', value: 41, clock: 2 }];
    merge(original, [{ key: 'bar', value: 42, clock: 3 }]);
    expect(original).toEqual([
      { key: 'bar', value: 42, clock: 3 },
      { key: 'foo', value: 41, clock: 2 },
    ]);
  });

  test('addLeafToGapEnd', () => {
    const original = [{ key: 'foo', value: 41, clock: 2 }];
    merge(original, [{ key: 'zop', value: 42, clock: 3 }]);
    expect(original).toEqual([
      { key: 'foo', value: 41, clock: 2 },
      { key: 'zop', value: 42, clock: 3 },
    ]);
  });

  test('addLeafToGapMiddle', () => {
    const original = [
      { key: 'bar', value: 42, clock: 3 },
      { key: 'foo', value: 41, clock: 2 },
    ];
    merge(original, [{ key: 'baz', value: 40, clock: 3 }]);
    expect(original).toEqual([
      { key: 'bar', value: 42, clock: 3 },
      { key: 'baz', value: 40, clock: 3 },
      { key: 'foo', value: 41, clock: 2 },
    ]);
  });
});

describe('addToRange', () => {
  test('addNewLeafToRangeStart', () => {
    const original = [{ key: 'foo', end: 'gah', clock: 2 }];
    merge(original, [{ key: 'foo', value: 42, clock: 3 }]);
    expect(original).toEqual([
      { key: 'foo', value: 42, clock: 3 },
      { key: 'foo\0', end: 'gah', clock: 2 },
    ]);
  });

  test('addNewLeafToRangeEnd', () => {
    const original = [{ key: 'foo', end: 'gah', clock: 2 }];
    merge(original, [{ key: 'gah', value: 42, clock: 3 }]);
    expect(original).toEqual([
      { key: 'foo', end: 'gag\uffff', clock: 2 },
      { key: 'gah', value: 42, clock: 3 },
    ]);
  });

  test('addNewLeafToRangeMiddle', () => {
    const original = [{ key: 'foo', end: 'gah', clock: 2 }];
    merge(original, [{ key: 'fuz', value: 42, clock: 3 }]);
    expect(original).toEqual([
      { key: 'foo', end: 'fuy\uffff', clock: 2 },
      { key: 'fuz', value: 42, clock: 3 },
      { key: 'fuz\0', end: 'gah', clock: 2 },
    ]);
  });

  test('addOldLeafToRangeStart', () => {
    const original = [{ key: 'foo', end: 'gah', clock: 3 }];
    merge(original, [{ key: 'foo', value: 42, clock: 2 }]);
    expect(original).toEqual([{ key: 'foo', end: 'gah', clock: 3 }]);
  });

  test('addOldLeafToRangeEnd', () => {
    const original = [{ key: 'foo', end: 'gah', clock: 3 }];
    merge(original, [{ key: 'gah', value: 42, clock: 2 }]);
    expect(original).toEqual([{ key: 'foo', end: 'gah', clock: 3 }]);
  });

  test('addOldLeafToRangeMiddle', () => {
    const original = [{ key: 'foo', end: 'gah', clock: 3 }];
    merge(original, [{ key: 'fuz', value: 42, clock: 2 }]);
    expect(original).toEqual([{ key: 'foo', end: 'gah', clock: 3 }]);
  });

  test('addBranchToRange', () => {
    const original = [{ key: 'foo', end: 'gah', clock: 2 }];
    merge(original, [
      {
        key: 'fuz',
        children: [
          { key: 'bar', value: 8, clock: 1 },
          { key: 'baz', value: 25, clock: 3 },
          { key: 'cat', value: 3, clock: 1 },
        ],
      },
    ]);
    expect(original).toEqual([
      { key: 'foo', end: 'fuy\uffff', clock: 2 },
      {
        key: 'fuz',
        children: [{ key: 'baz', value: 25, clock: 3 }],
      },
      { key: 'fuz\0', end: 'gah', clock: 2 },
    ]);
  });
});

describe('addRange', () => {
  test('addRange', () => {
    const original = [
      { key: 'bar', end: 'fos\uffff', clock: 2 },
      { key: 'fot', value: 42, clock: 2 },
      {
        key: 'foz',
        children: [
          { key: 'bar', value: 8, clock: 1 },
          { key: 'cat', value: 3, clock: 2 },
        ],
      },
      {
        key: 'fuz',
        children: [
          { key: 'bar', value: 8, clock: 1 },
          { key: 'baz', value: 25, clock: 4 },
          { key: 'cat', value: 3, clock: 2 },
        ],
      },
      { key: 'gah', value: 42, clock: 4 },
      { key: 'hey', value: 2, clock: 1 },
    ];
    merge(original, [{ key: 'foo', end: 'gah', clock: 3 }]);
    expect(original).toEqual([
      { key: 'bar', end: 'fon\uffff', clock: 2 },
      { key: 'foo', end: 'fuy\uffff', clock: 3 },
      {
        key: 'fuz',
        children: [{ key: 'baz', value: 25, clock: 4 }],
      },
      { key: 'fuz\0', end: 'gag\uffff', clock: 3 },
      { key: 'gah', value: 42, clock: 4 },
      { key: 'hey', value: 2, clock: 1 },
    ]);
  });
});

describe('errors', () => {
  test('clockCollisionError', () => {
    expect(() =>
      merge(
        [{ key: 'foo', value: 41, clock: 2 }],
        [{ key: 'foo', value: 42, clock: 2 }],
      ),
    ).toThrow();
  });
});
