import decorate from '../decorate.js';

describe('pagination', () => {
  test.only('backward_mid', () => {
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
