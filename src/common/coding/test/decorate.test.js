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

describe.skip('pagination', () => {
  test('backward_mid', () => {
    expect(
      decorate(
        [
          { key: 'foo', value: '123', version: 1 },
          { key: 'foo\0', end: '\uffff', version: 1 },
        ],
        [{ $key: { $first: 10, $since: 'foo' }, name: 1 }],
      ).prevPage,
    ).toEqual({ $last: 10, $before: 'foo' });
  });

  test('forward_end', () => {
    expect(
      decorate(
        [
          { key: 'foo', value: '123', version: 1 },
          { key: 'foo\0', end: '\uffff', version: 1 },
        ],
        [{ $key: { $first: 10, $since: 'foo' }, name: 1 }],
      ).nextPage,
    ).toBe(undefined);
  });

  test('backward_start', () => {
    expect(
      decorate(
        [
          { key: '', end: 'fon\uffff', version: 1 },
          { key: 'foo', value: '123', version: 1 },
        ],
        [{ $key: { $last: 10, $until: 'foo' }, name: 1 }],
      ).prevPage,
    ).toBe(undefined);
  });

  test('forward_end', () => {
    expect(
      decorate(
        [
          { key: '', end: 'fon\uffff', version: 1 },
          { key: 'foo', value: '123', version: 1 },
        ],
        [{ $key: { $last: 10, $until: 'foo' }, name: 1 }],
      ).nextPage,
    ).toEqual({ $first: 10, $after: 'foo' });
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
