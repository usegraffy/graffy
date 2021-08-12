import decorate from '../decorate.js';
import { encodeGraph } from '../encodeTree.js';

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
      foo: { $ref: ['bar'], baz: 10 },
    });
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

test.skip('arrayCursor.decode', () => {
  expect(
    decorate([{ key: '\x000VI-Ck--------', value: 25, version: 0 }], {
      $key: { $first: 3 },
    }),
  ).toEqual([25]);
});
