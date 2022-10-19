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
        { key: 'foo', value: 123, version: 1 },
        { key: 'foo\0', end: '\uffff', version: 1 },
      ],
      [{ $key: { $first: 10, $since: 'foo' } }],
    );
    const expected = [123];
    expected.$page = { $all: true, $since: 'foo' };
    expected.$next = null;
    expected.$prev = { $last: 10, $before: 'foo' };

    expect(result.$page).toEqual(expected.$page);
    expect(result.$prev).toEqual(expected.$prev);
    expect(result.$next).toEqual(expected.$next);
    expect(result).toEqual(expected);
  });

  test('forward_end', () => {
    const result = decorate(
      [
        { key: 'foo', value: 123, version: 1 },
        { key: 'foo\0', end: '\uffff', version: 1 },
      ],
      [{ $key: { $first: 10, $since: 'foo' } }],
    );
    const expected = [123];
    expected.$page = { $all: true, $since: 'foo' };
    expected.$next = null;
    expected.$prev = { $last: 10, $before: 'foo' };

    expect(result.$page).toEqual(expected.$page);
    expect(result.$prev).toEqual(expected.$prev);
    expect(result.$next).toEqual(expected.$next);
    expect(result).toEqual(expected);
  });

  test('backward_start', () => {
    const result = decorate(
      [
        { key: '', end: 'fon\uffff', version: 1 },
        { key: 'foo', value: 123, version: 1 },
      ],
      [{ $key: { $last: 10, $until: 'foo' } }],
    );
    const expected = [123];
    expected.$page = { $all: true, $until: 'foo' };
    expected.$next = { $first: 10, $after: 'foo' };
    expected.$prev = null;

    expect(result.$page).toEqual(expected.$page);
    expect(result.$prev).toEqual(expected.$prev);
    expect(result.$next).toEqual(expected.$next);
    expect(result).toEqual(expected);
  });

  test('forward_end', () => {
    const result = decorate(
      [
        { key: '', end: 'fon\uffff', version: 1 },
        { key: 'foo', value: 123, version: 1 },
      ],
      [{ $key: { $last: 10, $until: 'foo' } }],
    );
    const expected = [123];
    expected.$page = { $all: true, $until: 'foo' };
    expected.$next = { $first: 10, $after: 'foo' };
    expected.$prev = null;

    expect(result.$page).toEqual(expected.$page);
    expect(result.$prev).toEqual(expected.$prev);
    expect(result.$next).toEqual(expected.$next);
    expect(result).toEqual(expected);
  });

  test('simpleArray', () => {
    const result = decorate(
      [
        {
          key: 'baz',
          version: 0,
          children: [
            { key: '', end: '\x000VKV￿', version: 0 },
            { key: '\x000VKW', version: 0, path: ['foo'] },
            { key: '\x000VKW\x00', end: '￿', version: 0 },
          ],
        },
        { key: 'foo', version: 0, value: 42 },
      ],
      { baz: [{ $key: { $first: 2 } }] },
    );

    const expected = [42];
    expected.$page = { $all: true };
    expected.$next = null;
    expected.$prev = null;

    expect(result).toEqual({ baz: expected });
  });
});

// TODO: Test multi-hop links and loops.

test('arrayCursor.decode', () => {
  const decorated = decorate(
    [{ key: '\x000VI-Ck--------', value: 25, version: 0 }],
    {
      $key: { $first: 3 },
    },
  );
  const expected = [25];
  expected.$page = { $all: true };
  expected.$next = null;
  expected.$prev = null;
  expect(decorated).toEqual(expected);
});

test('alias', () => {
  const expectedArray = ref(
    ['foo', { t: 3, $first: 2 }],
    [
      { x: 100, $key: { t: 3, $cursor: 1 } },
      { x: 200, $key: { t: 3, $cursor: 2 } },
    ],
  );
  expectedArray.$page = { $all: true, $until: 2 };
  expectedArray.$next = { $first: 2, $after: 2 };
  expectedArray.$prev = null;

  const result = decorate(
    [
      {
        key: 'foo',
        version: 0,
        children: [
          {
            key: '\x000kKo--I-1-',
            version: 0,
            prefix: true,
            children: [
              { key: '', end: '\x000Azj￿', version: 1628955868126 },
              {
                key: '\x000Azk',
                version: 1628955868126,
                children: [{ key: 'x', version: 1628955868126, value: 100 }],
              },
              {
                key: '\x000Azk\x00',
                end: '\x000B,￿',
                version: 1628955868126,
              },
              {
                key: '\x000B-',
                version: 1628955868126,
                children: [{ key: 'x', version: 1628955868126, value: 200 }],
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
