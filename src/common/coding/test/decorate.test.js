import { page } from '@graffy/testing';
import { e } from '@graffy/testing/encoder.js';
import { keyAfter as aft, keyBefore as bef } from '../../ops/step.js';
import { MAX_KEY, MIN_KEY } from '../../util.js';
import { decode } from '../base64.js';
import decorate from '../decorate.js';
import { encodeGraph } from '../encodeTree.js';

const ref = (ref, obj) => {
  Object.defineProperty(obj, '$ref', { value: ref });
  return obj;
};

describe('references', () => {
  test('point', () => {
    const result = decorate(
      encodeGraph({
        foo: { $ref: ['bar'] },
        bar: { baz: 10 },
      }),
      { foo: { baz: 1 } },
    );

    expect(result).toEqual({
      foo: ref(['bar'], { baz: 10 }),
    });
    expect(result.foo.$ref).toEqual(['bar']);
  });
});

describe('pagination', () => {
  test('backward_mid', () => {
    const result = decorate(
      [
        { key: e.foo, value: 123, version: 1 },
        { key: aft(e.foo), end: MAX_KEY, version: 1 },
      ],
      [{ $key: { $first: 10, $since: 'foo' } }],
    );
    const expected = page({ $since: 'foo' }, 10, [123]);
    expect(result).toEqual(expected);
  });

  test('forward_end', () => {
    const result = decorate(
      [
        { key: e.foo, value: 123, version: 1 },
        { key: aft(e.foo), end: MAX_KEY, version: 1 },
      ],
      [{ $key: { $first: 10, $since: 'foo' } }],
    );
    const expected = page({ $since: 'foo' }, 10, [123]);
    expect(result).toEqual(expected);
  });

  test('backward_start', () => {
    const result = decorate(
      [
        { key: MIN_KEY, end: bef(e.foo), version: 1 },
        { key: e.foo, value: 123, version: 1 },
      ],
      [{ $key: { $last: 10, $until: 'foo' } }],
    );
    const expected = page({ $until: 'foo' }, 10, [123]);
    expect(result).toEqual(expected);
  });

  test('forward_end', () => {
    const result = decorate(
      [
        { key: MIN_KEY, end: bef(e.foo), version: 1 },
        { key: e.foo, value: 123, version: 1 },
      ],
      [{ $key: { $last: 10, $until: 'foo' } }],
    );
    const expected = page({ $until: 'foo' }, 10, [123]);
    expect(result).toEqual(expected);
  });

  test('simpleArray', () => {
    const result = decorate(
      [
        {
          key: e.baz,
          version: 0,
          children: [
            { key: MIN_KEY, end: bef(decode('0VKW')), version: 0 },
            { key: decode('0VKW'), version: 0, path: [e.foo] },
            { key: aft(decode('0VKW')), end: MAX_KEY, version: 0 },
          ],
        },
        { key: e.foo, version: 0, value: 42 },
      ],
      { baz: [{ $key: { $first: 2 } }] },
    );

    const expected = page({}, null, [42]);
    expect(result).toEqual({ baz: expected });
  });
});

// TODO: Test multi-hop links and loops.

test('arrayCursor.decode', () => {
  const decorated = decorate(
    [{ key: decode('0VI-Ck--------'), value: 25, version: 0 }],
    { $key: { $first: 3 } },
  );
  const expected = page({}, null, [25]);
  expect(decorated).toEqual(expected);
});

test('alias', () => {
  const expectedArray = ref(
    ['foo', { t: 3, $first: 2 }],
    page({ $until: 2 }, 2, [
      { x: 100, $key: { t: 3, $cursor: 1 } },
      { x: 200, $key: { t: 3, $cursor: 2 } },
    ]),
  );

  const result = decorate(
    [
      {
        key: e.foo,
        version: 0,
        children: [
          {
            key: decode('0kKo--I-1-'),
            version: 0,
            prefix: true,
            children: [
              {
                key: MIN_KEY,
                end: bef(decode('0Azk')),
                version: 1628955868126,
              },
              {
                key: decode('0Azk'),
                version: 1628955868126,
                children: [{ key: e.x, version: 1628955868126, value: 100 }],
              },
              {
                key: aft(decode('0Azk')),
                end: bef(decode('0B-')),
                version: 1628955868126,
              },
              {
                key: decode('0B-'),
                version: 1628955868126,
                children: [{ key: e.x, version: 1628955868126, value: 200 }],
              },
            ],
          },
        ],
      },
    ],
    { bar: { $ref: ['foo', { t: 3, $first: 2 }], x: 1 } },
  );

  expect(result).toEqual({ bar: expectedArray });
  expect(result.bar.$ref).toEqual(expectedArray.$ref);
});

describe('val_null', () => {
  test('implicit', () => {
    const result = decorate(
      [
        {
          key: e.foo,
          version: 0,
          children: [{ key: e.bar, version: 0, value: null }],
        },
      ],
      { foo: 1 },
    );
    expect(result).toEqual({ foo: { bar: null } });
  });

  test('explicit', () => {
    const result = decorate([{ key: e.foo, version: 0, value: null }], {
      foo: 1,
    });
    expect(result).toEqual({ foo: null });
  });
});
