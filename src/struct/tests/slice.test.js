import slice from '../slice';

describe('slice', () => {
  test('empty', () => {
    expect(slice([], [])).toEqual({});
  });

  test('simple', () => {
    expect(
      slice(
        [
          { key: 'foo', value: 42, clock: 3 },
          { key: 'foo\0', end: 'fuy\uffff', clock: 3 },
          { key: 'fuz', value: 43, clock: 3 },
        ],
        [
          { key: 'flo', value: 1, clock: 2 },
          { key: 'foo', value: 1, clock: 2 },
          { key: 'fub', value: 1, clock: 2 },
        ],
      ),
    ).toEqual({
      known: [
        { key: 'foo', value: 42, clock: 3 },
        { key: 'fub', end: 'fub', clock: 3 },
      ],
      unknown: [{ key: 'flo', value: 1, clock: 2 }],
    });
  });

  test('leaf_branch_mismatch', () => {
    expect(() =>
      slice(
        [
          {
            key: 'bar',
            children: [
              { key: 'foo', value: 42, clock: 3 },
              { key: 'fuz', value: 43, clock: 3 },
            ],
          },
        ],
        [{ key: 'bar', value: 1, clock: 2 }],
      ),
    ).toThrow();
  });
});

describe('range', () => {
  test('rangeForeFull', () => {
    expect(
      slice(
        [
          { key: 'bar', value: 1, clock: 1 },
          { key: 'bar\0', end: 'bas\uffff', clock: 1 },
          { key: 'bat', value: 2, clock: 1 },
          { key: 'bat\0', end: 'fon\uffff', clock: 1 },
          { key: 'foo', value: 3, clock: 1 },
          { key: 'foo\0', end: 'gag', clock: 1 },
        ],
        [{ key: 'bar', end: 'egg', count: 2, num: 1, clock: 0 }],
      ),
    ).toEqual({
      known: [
        { key: 'bar', value: 1, clock: 1 },
        { key: 'bar\0', end: 'bas\uffff', clock: 1 },
        { key: 'bat', value: 2, clock: 1 },
      ],
    });
  });

  test('rangeBackFull', () => {
    expect(
      slice(
        [
          { key: 'bar', value: 1, clock: 1 },
          { key: 'bar\0', end: 'bas\uffff', clock: 1 },
          { key: 'bat', value: 2, clock: 1 },
          { key: 'bat\0', end: 'fon\uffff', clock: 1 },
          { key: 'foo', value: 3, clock: 1 },
          { key: 'foo\0', end: 'gag', clock: 1 },
        ],
        [{ key: 'bar', end: 'egg', count: -2, num: 1, clock: 0 }],
      ),
    ).toEqual({
      known: [
        { key: 'bar', value: 1, clock: 1 },
        { key: 'bar\0', end: 'bas\uffff', clock: 1 },
        { key: 'bat', value: 2, clock: 1 },
        { key: 'bat\0', end: 'egg', clock: 1 },
      ],
    });
  });

  test('rangeBackPart', () => {
    expect(
      slice(
        [
          { key: 'bar', value: 1, clock: 1 },
          { key: 'bar\0', end: 'bas\uffff', clock: 1 },
          { key: 'bat', value: 2, clock: 1 },
          { key: 'bat\0', end: 'fon\uffff', clock: 1 },
          { key: 'foo', value: 3, clock: 1 },
          { key: 'foo\0', end: 'gag', clock: 1 },
        ],
        [{ key: '', end: 'egg', count: -3, num: 1, clock: 0 }],
      ),
    ).toEqual({
      known: [
        { key: 'bar', value: 1, clock: 1 },
        { key: 'bar\0', end: 'bas\uffff', clock: 1 },
        { key: 'bat', value: 2, clock: 1 },
        { key: 'bat\0', end: 'egg', clock: 1 },
      ],
      unknown: [{ key: '', end: 'baq\uffff', count: -1, num: 1, clock: 0 }],
    });
  });

  test('rangeForeClip', () => {
    expect(
      slice(
        [
          { key: 'bar', value: 1, clock: 1 },
          { key: 'bar\0', end: 'bas\uffff', clock: 1 },
          { key: 'bat', value: 2, clock: 1 },
          { key: 'bat\0', end: 'fon\uffff', clock: 1 },
          { key: 'foo', value: 3, clock: 1 },
          { key: 'foo\0', end: 'gag', clock: 1 },
        ],
        [{ key: 'bark', end: 'fuz', count: 3, num: 1, clock: 0 }],
      ),
    ).toEqual({
      known: [
        { key: 'bark', end: 'bas\uffff', clock: 1 },
        { key: 'bat', value: 2, clock: 1 },
        { key: 'bat\0', end: 'fon\uffff', clock: 1 },
        { key: 'foo', value: 3, clock: 1 },
        { key: 'foo\0', end: 'fuz', clock: 1 },
      ],
    });
  });

  test('rangeForeEmpty', () => {
    expect(
      slice(
        [
          { key: 'bar', value: 1, clock: 1 },
          { key: 'bar\0', end: 'bas\uffff', clock: 1 },
          { key: 'bat', value: 2, clock: 1 },
          { key: 'bat\0', end: 'fon\uffff', clock: 1 },
          { key: 'foo', value: 3, clock: 1 },
          { key: 'foo\0', end: 'gag', clock: 1 },
        ],
        [{ key: 'ark', end: 'foo', count: 3, num: 1, clock: 0 }],
      ),
    ).toEqual({
      unknown: [{ key: 'ark', end: 'foo', count: 3, num: 1, clock: 0 }],
    });
  });

  test.only('rangeForeComplete', () => {
    expect(
      slice(
        [
          { key: '', end: 'baq\uffff', clock: 1 },
          { key: 'bar', value: 1, clock: 1 },
          { key: 'bar\0', end: 'bas\uffff', clock: 1 },
          { key: 'bat', value: 2, clock: 1 },
          { key: 'bat\0', end: 'fon\uffff', clock: 1 },
          { key: 'foo', value: 3, clock: 1 },
          { key: 'foo\0', end: '\uffff', clock: 1 },
        ],
        [{ key: '', end: '\uffff', count: 5000, num: 1, clock: 0 }],
      ),
    ).toEqual({
      known: [
        { key: '', end: 'baq\uffff', clock: 1 },
        { key: 'bar', value: 1, clock: 1 },
        { key: 'bar\0', end: 'bas\uffff', clock: 1 },
        { key: 'bat', value: 2, clock: 1 },
        { key: 'bat\0', end: 'fon\uffff', clock: 1 },
        { key: 'foo', value: 3, clock: 1 },
        { key: 'foo\0', end: '\uffff', clock: 1 },
      ],
    });
  });
});

describe('link', () => {
  test('linkLeafonly', () => {
    expect(
      slice(
        [
          { key: 'bar', value: 1, clock: 1 },
          { key: 'bat', path: ['bar'], clock: 1 },
        ],
        [{ key: 'bat', num: 1, clock: 0 }],
      ),
    ).toEqual({
      known: [{ key: 'bat', path: ['bar'], clock: 1 }],
    });
  });

  test('linkThrough', () => {
    expect(
      slice(
        [
          {
            key: 'bar',
            children: [
              { key: 'foo', value: 42, clock: 3 },
              { key: 'fuz', value: 43, clock: 3 },
            ],
          },
          { key: 'bat', path: ['bar'], clock: 3 },
        ],
        [
          {
            key: 'bat',
            clock: 2,
            children: [
              { key: 'flo', value: 1, clock: 2 },
              { key: 'foo', value: 1, clock: 2 },
            ],
          },
        ],
      ),
    ).toEqual({
      known: [
        { key: 'bar', children: [{ key: 'foo', value: 42, clock: 3 }] },
        { key: 'bat', path: ['bar'], clock: 3 },
      ],
      unknown: [
        { key: 'bar', clock: 2, children: [{ key: 'flo', value: 1, clock: 2 }] },
      ],
    });
  });

  test('linkBroken', () => {
    expect(
      slice(
        [{ key: 'bat', path: ['bar'], clock: 3 }],
        [
          {
            key: 'bat',
            clock: 2,
            children: [
              { key: 'flo', value: 1, clock: 2 },
              { key: 'foo', value: 1, clock: 2 },
            ],
          },
        ],
      ),
    ).toEqual({
      known: [{ key: 'bat', path: ['bar'], clock: 3 }],
      unknown: [
        {
          key: 'bar',
          clock: 2,
          children: [
            { key: 'flo', value: 1, clock: 2 },
            { key: 'foo', value: 1, clock: 2 },
          ],
        },
      ],
    });
  });
});

describe('clock', () => {
  test('ignoreOldInRanges', () => {
    expect(
      slice(
        [
          { key: 'bar', value: 1, clock: 1 },
          { key: 'bar\0', end: 'bas\uffff', clock: 1 },
          { key: 'bat', value: 2, clock: 0 },
          { key: 'bat\0', end: 'fon\uffff', clock: 1 },
          { key: 'foo', value: 3, clock: 1 },
          { key: 'foo\0', end: 'gag', clock: 1 },
        ],
        [{ key: 'bark', end: 'fuz', count: 3, num: 1, clock: 1 }],
      ),
    ).toEqual({
      known: [{ key: 'bark', end: 'bas\uffff', clock: 1 }],
      unknown: [{ key: 'bat', end: 'fuz', count: 3, clock: 1, num: 1 }],
    });
  });

  test('ignoreOldLink', () => {
    expect(
      slice(
        [
          {
            key: 'bar',
            children: [
              { key: 'foo', value: 42, clock: 3 },
              { key: 'fuz', value: 43, clock: 3 },
            ],
          },
          { key: 'bat', path: ['bar'], clock: 1 },
        ],
        [
          {
            key: 'bat',
            clock: 2,
            children: [
              { key: 'flo', value: 1, clock: 2 },
              { key: 'foo', value: 1, clock: 2 },
            ],
          },
        ],
      ),
    ).toEqual({
      unknown: [
        {
          key: 'bat',
          clock: 2,
          children: [
            { key: 'flo', value: 1, clock: 2 },
            { key: 'foo', value: 1, clock: 2 },
          ],
        },
      ],
    });
  });
});
