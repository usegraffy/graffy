import { e } from '@graffy/testing/encoder.js';
import { MAX_KEY, MIN_KEY } from '../../util.js';
import { keyAfter as aft, keyBefore as bef } from '../step.js';
import slice from '../slice.js';

describe('slice', () => {
  test('empty', () => {
    expect(slice([], [])).toEqual({});
  });

  test('simple', () => {
    // Skipping because of a bug in extracting a single null from a range.
    expect(
      slice(
        [
          { key: e.foo, value: 42, version: 3 },
          { key: aft(e.foo), end: bef(e.fuz), version: 3 },
          { key: e.fuz, value: 43, version: 3 },
        ],
        [
          { key: e.flo, value: 1, version: 2 },
          { key: e.foo, value: 1, version: 2 },
          { key: e.fub, value: 1, version: 2 },
        ],
      ),
    ).toEqual({
      known: [
        { key: e.foo, value: 42, version: 3 },
        { key: e.fub, end: e.fub, version: 3 },
      ],
      unknown: [{ key: e.flo, value: 1, version: 2 }],
    });
  });

  test('gbranch_qleaf', () => {
    expect(
      slice(
        [
          {
            key: e.bar,
            children: [
              { key: e.foo, value: 42, version: 3 },
              { key: e.fuz, value: 43, version: 3 },
            ],
          },
        ],
        [{ key: e.bar, value: 1, version: 2 }],
      ).known,
    ).toEqual([
      {
        key: e.bar,
        children: [
          { key: e.foo, value: 42, version: 3 },
          { key: e.fuz, value: 43, version: 3 },
        ],
      },
    ]);
  });
});

test('gleaf_qbranch', () => {
  expect(
    slice(
      [
        {
          key: e.bar,
          version: 3,
          value: 'abc',
        },
      ],
      [
        {
          key: e.bar,
          value: 1,
          children: [
            { key: e.foo, value: 42, version: 2 },
            { key: e.fuz, value: 43, version: 2 },
          ],
          version: 2,
        },
      ],
    ).known,
  ).toEqual([
    {
      key: e.bar,
      version: 3,
      children: [
        { key: e.foo, end: e.foo, version: 3 },
        { key: e.fuz, end: e.fuz, version: 3 },
      ],
    },
  ]);
});

describe('range', () => {
  test('rangeEmpty', () => {
    expect(
      slice(
        [{ key: MIN_KEY, end: MAX_KEY, version: 1 }],
        [
          {
            key: MIN_KEY,
            end: MAX_KEY,
            limit: 2,
            version: 0,
            children: [{ key: e.foo, value: 1, version: 0 }],
          },
        ],
      ),
    ).toEqual({ known: [{ key: MIN_KEY, end: MAX_KEY, version: 1 }] });
  });

  test('rangeForeFull', () => {
    expect(
      slice(
        [
          { key: e.bar, value: 1, version: 1 },
          { key: aft(e.bar), end: bef(e.bat), version: 1 },
          { key: e.bat, value: 2, version: 1 },
          { key: aft(e.bat), end: bef(e.foo), version: 1 },
          { key: e.foo, value: 3, version: 1 },
          { key: aft(e.foo), end: e.gag, version: 1 },
        ],
        [{ key: e.bar, end: e.egg, limit: 2, num: 1, version: 0 }],
      ),
    ).toEqual({
      known: [
        { key: e.bar, value: 1, version: 1 },
        { key: aft(e.bar), end: bef(e.bat), version: 1 },
        { key: e.bat, value: 2, version: 1 },
      ],
    });
  });

  test('rangeBackFull', () => {
    expect(
      slice(
        [
          { key: e.bar, value: 1, version: 1 },
          { key: aft(e.bar), end: bef(e.bat), version: 1 },
          { key: e.bat, value: 2, version: 1 },
          { key: aft(e.bat), end: bef(e.foo), version: 1 },
          { key: e.foo, value: 3, version: 1 },
          { key: aft(e.foo), end: e.gag, version: 1 },
        ],
        [{ end: e.bar, key: e.egg, limit: 2, num: 1, version: 0 }],
      ),
    ).toEqual({
      known: [
        { key: e.bar, value: 1, version: 1 },
        { key: aft(e.bar), end: bef(e.bat), version: 1 },
        { key: e.bat, value: 2, version: 1 },
        { key: aft(e.bat), end: e.egg, version: 1 },
      ],
    });
  });

  test('rangeBackPart', () => {
    expect(
      slice(
        [
          { key: e.bar, value: 1, version: 1 },
          { key: aft(e.bar), end: bef(e.bat), version: 1 },
          { key: e.bat, value: 2, version: 1 },
          { key: aft(e.bat), end: bef(e.foo), version: 1 },
          { key: e.foo, value: 3, version: 1 },
          { key: aft(e.foo), end: e.gag, version: 1 },
        ],
        [{ end: MIN_KEY, key: e.egg, limit: 3, num: 1, version: 0 }],
      ),
    ).toEqual({
      known: [
        { key: e.bar, value: 1, version: 1 },
        { key: aft(e.bar), end: bef(e.bat), version: 1 },
        { key: e.bat, value: 2, version: 1 },
        { key: aft(e.bat), end: e.egg, version: 1 },
      ],
      unknown: [
        { end: MIN_KEY, key: bef(e.bar), limit: 1, num: 1, version: 0 },
      ],
    });
  });

  test('rangeForeClip', () => {
    expect(
      slice(
        [
          { key: e.bar, value: 1, version: 1 },
          { key: aft(e.bar), end: bef(e.bat), version: 1 },
          { key: e.bat, value: 2, version: 1 },
          { key: aft(e.bat), end: bef(e.foo), version: 1 },
          { key: e.foo, value: 3, version: 1 },
          { key: aft(e.foo), end: e.gag, version: 1 },
        ],
        [{ key: e.bark, end: e.fuz, limit: 3, num: 1, version: 0 }],
      ),
    ).toEqual({
      known: [
        { key: e.bark, end: bef(e.bat), version: 1 },
        { key: e.bat, value: 2, version: 1 },
        { key: aft(e.bat), end: bef(e.foo), version: 1 },
        { key: e.foo, value: 3, version: 1 },
        { key: aft(e.foo), end: e.fuz, version: 1 },
      ],
    });
  });

  test('rangeForeEmpty', () => {
    expect(
      slice(
        [
          { key: e.bar, value: 1, version: 1 },
          { key: aft(e.bar), end: bef(e.bat), version: 1 },
          { key: e.bat, value: 2, version: 1 },
          { key: aft(e.bat), end: bef(e.foo), version: 1 },
          { key: e.foo, value: 3, version: 1 },
          { key: aft(e.foo), end: e.gag, version: 1 },
        ],
        [{ key: e.ark, end: e.foo, limit: 3, num: 1, version: 0 }],
      ),
    ).toEqual({
      unknown: [{ key: e.ark, end: e.foo, limit: 3, num: 1, version: 0 }],
    });
  });

  test('rangeForeComplete', () => {
    expect(
      slice(
        [
          { key: MIN_KEY, end: bef(e.bar), version: 1 },
          { key: e.bar, value: 1, version: 1 },
          { key: aft(e.bar), end: bef(e.bat), version: 1 },
          { key: e.bat, value: 2, version: 1 },
          { key: aft(e.bat), end: bef(e.foo), version: 1 },
          { key: e.foo, value: 3, version: 1 },
          { key: aft(e.foo), end: MAX_KEY, version: 1 },
        ],
        [{ key: MIN_KEY, end: MAX_KEY, limit: 5000, num: 1, version: 0 }],
      ),
    ).toEqual({
      known: [
        { key: MIN_KEY, end: bef(e.bar), version: 1 },
        { key: e.bar, value: 1, version: 1 },
        { key: aft(e.bar), end: bef(e.bat), version: 1 },
        { key: e.bat, value: 2, version: 1 },
        { key: aft(e.bat), end: bef(e.foo), version: 1 },
        { key: e.foo, value: 3, version: 1 },
        { key: aft(e.foo), end: MAX_KEY, version: 1 },
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
            key: e.bar,
            children: [
              { key: e.foo, value: 42, version: 3 },
              { key: e.fuz, value: 43, version: 3 },
            ],
          },
          { key: e.bat, path: [e.bar], version: 3 },
        ],
        [
          {
            key: e.bat,
            version: 2,
            children: [
              { key: e.flo, value: 1, version: 2 },
              { key: e.foo, value: 1, version: 2 },
            ],
          },
        ],
      ),
    ).toEqual({
      known: [
        { key: e.bar, children: [{ key: e.foo, value: 42, version: 3 }] },
        { key: e.bat, path: [e.bar], version: 3 },
      ],
      unknown: [
        {
          key: e.bar,
          version: 2,
          children: [{ key: e.flo, value: 1, version: 2 }],
        },
      ],
    });
  });

  test('linkToLeaf', () => {
    expect(
      slice(
        [
          { key: e.bar, version: 1, value: 25 },
          { key: e.foo, version: 1, path: [e.bar] },
        ],
        [{ key: e.foo, version: 0, value: 1 }],
      ).known,
    ).toEqual([
      { key: e.bar, version: 1, value: 25 },
      { key: e.foo, version: 1, path: [e.bar] },
    ]);
  });

  test('linkBroken', () => {
    expect(
      slice(
        [{ key: e.bat, path: [e.bar], version: 3 }],
        [
          {
            key: e.bat,
            version: 2,
            children: [
              { key: e.flo, value: 1, version: 2 },
              { key: e.foo, value: 1, version: 2 },
            ],
          },
        ],
      ),
    ).toEqual({
      known: [{ key: e.bat, path: [e.bar], version: 3 }],
      unknown: [
        {
          key: e.bar,
          version: 2,
          children: [
            { key: e.flo, value: 1, version: 2 },
            { key: e.foo, value: 1, version: 2 },
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
          { key: e.bar, value: 1, version: 1 },
          { key: aft(e.bar), end: bef(e.bat), version: 1 },
          { key: e.bat, value: 2, version: 0 },
          { key: aft(e.bat), end: bef(e.foo), version: 1 },
          { key: e.foo, value: 3, version: 1 },
          { key: aft(e.foo), end: e.gag, version: 1 },
        ],
        [{ key: e.bark, end: e.fuz, limit: 3, num: 1, version: 1 }],
      ),
    ).toEqual({
      known: [{ key: e.bark, end: bef(e.bat), version: 1 }],
      unknown: [{ key: e.bat, end: e.fuz, limit: 3, version: 1, num: 1 }],
    });
  });

  test('ignoreOldLink', () => {
    expect(
      slice(
        [
          {
            key: e.bar,
            children: [
              { key: e.foo, value: 42, version: 3 },
              { key: e.fuz, value: 43, version: 3 },
            ],
          },
          { key: e.bat, path: [e.bar], version: 1 },
        ],
        [
          {
            key: e.bat,
            version: 2,
            children: [
              { key: e.flo, value: 1, version: 2 },
              { key: e.foo, value: 1, version: 2 },
            ],
          },
        ],
      ),
    ).toEqual({
      unknown: [
        {
          key: e.bat,
          version: 2,
          children: [
            { key: e.flo, value: 1, version: 2 },
            { key: e.foo, value: 1, version: 2 },
          ],
        },
      ],
    });
  });

  test('leafInRange', () => {
    expect(
      slice(
        [
          { key: MIN_KEY, end: bef(e.foo), version: 0 },
          { key: e.foo, version: 1580541870611, value: 42 },
          { key: aft(e.foo), end: MAX_KEY, version: 0 },
        ],
        [
          { key: e.bar, version: 0, value: 1 },
          { key: e.foo, version: 0, value: 1 },
        ],
      ).known,
    ).toEqual([
      { key: e.bar, end: e.bar, version: 0 },
      { key: e.foo, version: 1580541870611, value: 42 },
    ]);
  });

  test('frozenQueryLinks', () => {
    expect(
      slice(
        [
          { key: e.bar, version: 0, path: [e.foo] },
          { key: e.baz, version: 0, path: [e.foo] },
          {
            key: e.foo,
            version: 0,
            children: [{ key: e.x, version: 0, value: 42 }],
          },
        ],
        [
          {
            key: e.bar,
            version: 0,
            children: Object.freeze([{ key: e.x, version: 0, value: 1 }]),
          },
          {
            key: e.baz,
            version: 0,
            children: Object.freeze([{ key: e.x, version: 0, value: 1 }]),
          },
        ],
      ),
    ).toEqual({
      known: [
        { key: e.bar, version: 0, path: [e.foo] },
        { key: e.baz, version: 0, path: [e.foo] },
        {
          key: e.foo,
          version: 0,
          children: [{ key: e.x, version: 0, value: 42 }],
        },
      ],
    });
  });
});

test('prefix', () => {
  expect(
    slice(
      [
        {
          key: e.favs,
          version: 0,
          children: [
            {
              key: '(tag:x)',
              version: 0,
              path: ['posts', '(favs:true,tag:x)'],
              prefix: true,
            },
          ],
        },
      ],
      [
        {
          key: e.favs,
          version: 0,
          children: [
            {
              key: '(tag:x)',
              version: 0,
              children: [
                {
                  key: MIN_KEY,
                  end: MAX_KEY,
                  limit: 3,
                  version: 0,
                  children: [{ key: e.name, version: 0, value: 1 }],
                },
              ],
            },
          ],
        },
      ],
    ),
  ).toEqual({
    known: [
      {
        key: e.favs,
        version: 0,
        children: [
          {
            key: '(tag:x)',
            version: 0,
            path: ['posts', '(favs:true,tag:x)'],
            prefix: true,
          },
        ],
      },
    ],
    unknown: [
      {
        key: e.posts,
        version: 0,
        children: [
          {
            key: '(favs:true,tag:x)',
            version: 0,
            prefix: true,
            children: [
              {
                key: MIN_KEY,
                end: MAX_KEY,
                limit: 3,
                version: 0,
                children: [{ key: e.name, version: 0, value: 1 }],
              },
            ],
          },
        ],
      },
    ],
  });
});
