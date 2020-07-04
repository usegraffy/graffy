import slice from '../slice';

describe('slice', () => {
  test('empty', () => {
    expect(slice([], [])).toEqual({});
  });

  test('simple', () => {
    // Skipping because of a bug in extracting a single null from a range.
    expect(
      slice(
        [
          { key: 'foo', value: 42, version: 3 },
          { key: 'foo\0', end: 'fuy\uffff', version: 3 },
          { key: 'fuz', value: 43, version: 3 },
        ],
        [
          { key: 'flo', value: 1, version: 2 },
          { key: 'foo', value: 1, version: 2 },
          { key: 'fub', value: 1, version: 2 },
        ],
      ),
    ).toEqual({
      known: [
        { key: 'foo', value: 42, version: 3 },
        { key: 'fub', end: 'fub', version: 3 },
      ],
      unknown: [{ key: 'flo', value: 1, version: 2 }],
    });
  });

  test('leaf_branch_mismatch', () => {
    expect(() =>
      slice(
        [
          {
            key: 'bar',
            children: [
              { key: 'foo', value: 42, version: 3 },
              { key: 'fuz', value: 43, version: 3 },
            ],
          },
        ],
        [{ key: 'bar', value: 1, version: 2 }],
      ),
    ).toThrow();
  });
});

describe('range', () => {
  test('rangeEmpty', () => {
    expect(
      slice(
        [{ key: '', end: '\uffff', version: 1 }],
        [
          {
            key: '',
            end: '\uffff',
            count: 2,
            version: 0,
            children: [{ key: 'foo', value: 1, version: 0 }],
          },
        ],
      ),
    ).toEqual({ known: [{ key: '', end: '\uffff', version: 1 }] });
  });

  test('rangeForeFull', () => {
    expect(
      slice(
        [
          { key: 'bar', value: 1, version: 1 },
          { key: 'bar\0', end: 'bas\uffff', version: 1 },
          { key: 'bat', value: 2, version: 1 },
          { key: 'bat\0', end: 'fon\uffff', version: 1 },
          { key: 'foo', value: 3, version: 1 },
          { key: 'foo\0', end: 'gag', version: 1 },
        ],
        [{ key: 'bar', end: 'egg', count: 2, num: 1, version: 0 }],
      ),
    ).toEqual({
      known: [
        { key: 'bar', value: 1, version: 1 },
        { key: 'bar\0', end: 'bas\uffff', version: 1 },
        { key: 'bat', value: 2, version: 1 },
      ],
    });
  });

  test('rangeBackFull', () => {
    expect(
      slice(
        [
          { key: 'bar', value: 1, version: 1 },
          { key: 'bar\0', end: 'bas\uffff', version: 1 },
          { key: 'bat', value: 2, version: 1 },
          { key: 'bat\0', end: 'fon\uffff', version: 1 },
          { key: 'foo', value: 3, version: 1 },
          { key: 'foo\0', end: 'gag', version: 1 },
        ],
        [{ key: 'bar', end: 'egg', count: -2, num: 1, version: 0 }],
      ),
    ).toEqual({
      known: [
        { key: 'bar', value: 1, version: 1 },
        { key: 'bar\0', end: 'bas\uffff', version: 1 },
        { key: 'bat', value: 2, version: 1 },
        { key: 'bat\0', end: 'egg', version: 1 },
      ],
    });
  });

  test('rangeBackPart', () => {
    expect(
      slice(
        [
          { key: 'bar', value: 1, version: 1 },
          { key: 'bar\0', end: 'bas\uffff', version: 1 },
          { key: 'bat', value: 2, version: 1 },
          { key: 'bat\0', end: 'fon\uffff', version: 1 },
          { key: 'foo', value: 3, version: 1 },
          { key: 'foo\0', end: 'gag', version: 1 },
        ],
        [{ key: '', end: 'egg', count: -3, num: 1, version: 0 }],
      ),
    ).toEqual({
      known: [
        { key: 'bar', value: 1, version: 1 },
        { key: 'bar\0', end: 'bas\uffff', version: 1 },
        { key: 'bat', value: 2, version: 1 },
        { key: 'bat\0', end: 'egg', version: 1 },
      ],
      unknown: [{ key: '', end: 'baq\uffff', count: -1, num: 1, version: 0 }],
    });
  });

  test('rangeForeClip', () => {
    expect(
      slice(
        [
          { key: 'bar', value: 1, version: 1 },
          { key: 'bar\0', end: 'bas\uffff', version: 1 },
          { key: 'bat', value: 2, version: 1 },
          { key: 'bat\0', end: 'fon\uffff', version: 1 },
          { key: 'foo', value: 3, version: 1 },
          { key: 'foo\0', end: 'gag', version: 1 },
        ],
        [{ key: 'bark', end: 'fuz', count: 3, num: 1, version: 0 }],
      ),
    ).toEqual({
      known: [
        { key: 'bark', end: 'bas\uffff', version: 1 },
        { key: 'bat', value: 2, version: 1 },
        { key: 'bat\0', end: 'fon\uffff', version: 1 },
        { key: 'foo', value: 3, version: 1 },
        { key: 'foo\0', end: 'fuz', version: 1 },
      ],
    });
  });

  test('rangeForeEmpty', () => {
    expect(
      slice(
        [
          { key: 'bar', value: 1, version: 1 },
          { key: 'bar\0', end: 'bas\uffff', version: 1 },
          { key: 'bat', value: 2, version: 1 },
          { key: 'bat\0', end: 'fon\uffff', version: 1 },
          { key: 'foo', value: 3, version: 1 },
          { key: 'foo\0', end: 'gag', version: 1 },
        ],
        [{ key: 'ark', end: 'foo', count: 3, num: 1, version: 0 }],
      ),
    ).toEqual({
      unknown: [{ key: 'ark', end: 'foo', count: 3, num: 1, version: 0 }],
    });
  });

  test('rangeForeComplete', () => {
    expect(
      slice(
        [
          { key: '', end: 'baq\uffff', version: 1 },
          { key: 'bar', value: 1, version: 1 },
          { key: 'bar\0', end: 'bas\uffff', version: 1 },
          { key: 'bat', value: 2, version: 1 },
          { key: 'bat\0', end: 'fon\uffff', version: 1 },
          { key: 'foo', value: 3, version: 1 },
          { key: 'foo\0', end: '\uffff', version: 1 },
        ],
        [{ key: '', end: '\uffff', count: 5000, num: 1, version: 0 }],
      ),
    ).toEqual({
      known: [
        { key: '', end: 'baq\uffff', version: 1 },
        { key: 'bar', value: 1, version: 1 },
        { key: 'bar\0', end: 'bas\uffff', version: 1 },
        { key: 'bat', value: 2, version: 1 },
        { key: 'bat\0', end: 'fon\uffff', version: 1 },
        { key: 'foo', value: 3, version: 1 },
        { key: 'foo\0', end: '\uffff', version: 1 },
      ],
    });
  });
});

describe('link', () => {
  test('linkThrough', () => {
    expect(
      slice(
        [
          {
            key: 'bar',
            children: [
              { key: 'foo', value: 42, version: 3 },
              { key: 'fuz', value: 43, version: 3 },
            ],
          },
          { key: 'bat', path: ['bar'], version: 3 },
        ],
        [
          {
            key: 'bat',
            version: 2,
            children: [
              { key: 'flo', value: 1, version: 2 },
              { key: 'foo', value: 1, version: 2 },
            ],
          },
        ],
      ),
    ).toEqual({
      known: [
        { key: 'bar', children: [{ key: 'foo', value: 42, version: 3 }] },
        { key: 'bat', path: ['bar'], version: 3 },
      ],
      unknown: [
        {
          key: 'bar',
          version: 2,
          children: [{ key: 'flo', value: 1, version: 2 }],
        },
      ],
    });
  });

  test('linkToLeaf', () => {
    expect(
      slice(
        [
          { key: 'bar', version: 1, value: 25 },
          { key: 'foo', version: 1, path: ['bar'] },
        ],
        [{ key: 'foo', version: 0, value: 1 }],
      ).known,
    ).toEqual([
      { key: 'bar', version: 1, value: 25 },
      { key: 'foo', version: 1, path: ['bar'] },
    ]);
  });

  test('linkBroken', () => {
    expect(
      slice(
        [{ key: 'bat', path: ['bar'], version: 3 }],
        [
          {
            key: 'bat',
            version: 2,
            children: [
              { key: 'flo', value: 1, version: 2 },
              { key: 'foo', value: 1, version: 2 },
            ],
          },
        ],
      ),
    ).toEqual({
      known: [{ key: 'bat', path: ['bar'], version: 3 }],
      unknown: [
        {
          key: 'bar',
          version: 2,
          children: [
            { key: 'flo', value: 1, version: 2 },
            { key: 'foo', value: 1, version: 2 },
          ],
        },
      ],
    });
  });
});

describe('version', () => {
  test('ignoreOldInRanges', () => {
    expect(
      slice(
        [
          { key: 'bar', value: 1, version: 1 },
          { key: 'bar\0', end: 'bas\uffff', version: 1 },
          { key: 'bat', value: 2, version: 0 },
          { key: 'bat\0', end: 'fon\uffff', version: 1 },
          { key: 'foo', value: 3, version: 1 },
          { key: 'foo\0', end: 'gag', version: 1 },
        ],
        [{ key: 'bark', end: 'fuz', count: 3, num: 1, version: 1 }],
      ),
    ).toEqual({
      known: [{ key: 'bark', end: 'bas\uffff', version: 1 }],
      unknown: [{ key: 'bat', end: 'fuz', count: 3, version: 1, num: 1 }],
    });
  });

  test('ignoreOldLink', () => {
    expect(
      slice(
        [
          {
            key: 'bar',
            children: [
              { key: 'foo', value: 42, version: 3 },
              { key: 'fuz', value: 43, version: 3 },
            ],
          },
          { key: 'bat', path: ['bar'], version: 1 },
        ],
        [
          {
            key: 'bat',
            version: 2,
            children: [
              { key: 'flo', value: 1, version: 2 },
              { key: 'foo', value: 1, version: 2 },
            ],
          },
        ],
      ),
    ).toEqual({
      unknown: [
        {
          key: 'bat',
          version: 2,
          children: [
            { key: 'flo', value: 1, version: 2 },
            { key: 'foo', value: 1, version: 2 },
          ],
        },
      ],
    });
  });

  test('leafInRange', () => {
    expect(
      slice(
        [
          { key: '', end: 'fon\uffff', version: 0 },
          { key: 'foo', version: 1580541870611, value: 42 },
          { key: 'foo\u0000', end: '\uffff', version: 0 },
        ],
        [
          { key: 'bar', version: 0, value: 1 },
          { key: 'foo', version: 0, value: 1 },
        ],
      ).known,
    ).toEqual([
      { key: 'bar', end: 'bar', version: 0 },
      { key: 'foo', version: 1580541870611, value: 42 },
    ]);
  });

  test('frozenQueryLinks', () => {
    expect(
      slice(
        [
          { key: 'bar', version: 0, path: ['foo'] },
          { key: 'baz', version: 0, path: ['foo'] },
          {
            key: 'foo',
            version: 0,
            children: [{ key: 'x', version: 0, value: 42 }],
          },
        ],
        [
          {
            key: 'bar',
            version: 0,
            children: Object.freeze([{ key: 'x', version: 0, value: 1 }]),
          },
          {
            key: 'baz',
            version: 0,
            children: Object.freeze([{ key: 'x', version: 0, value: 1 }]),
          },
        ],
      ),
    ).toEqual({
      known: [
        { key: 'bar', version: 0, path: ['foo'] },
        { key: 'baz', version: 0, path: ['foo'] },
        {
          key: 'foo',
          version: 0,
          children: [{ key: 'x', version: 0, value: 42 }],
        },
      ],
    });
  });
});
