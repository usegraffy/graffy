import { validateCall, validateOn } from '../validate.js';

describe('call', () => {
  test('one-arg', () => {
    expect(validateCall({ foo: 43 })).toEqual([[], { foo: 43 }, {}]);
  });

  test('string_path_payload', () => {
    expect(validateCall('bar.baz', { foo: 43 })).toEqual([
      ['bar', 'baz'],
      { foo: 43 },
      {},
    ]);
  });

  test('array_path_payload', () => {
    expect(validateCall(['bar'], { foo: 43 })).toEqual([
      ['bar'],
      { foo: 43 },
      {},
    ]);
  });

  test('payload_options', () => {
    expect(validateCall({ foo: 43 }, { skip: true })).toEqual([
      [],
      { foo: 43 },
      { skip: true },
    ]);
  });

  test('all_empty_string_path', () => {
    expect(validateCall('', { foo: 43 }, { skip: true })).toEqual([
      [],
      { foo: 43 },
      { skip: true },
    ]);
  });

  test('all_empty_array_path', () => {
    expect(validateCall([], { foo: 43 }, { skip: true })).toEqual([
      [],
      { foo: 43 },
      { skip: true },
    ]);
  });

  test('all_string_path', () => {
    expect(validateCall('bar.baz', { foo: 43 }, { skip: true })).toEqual([
      ['bar', 'baz'],
      { foo: 43 },
      { skip: true },
    ]);
  });

  test('all_array_path', () => {
    expect(validateCall(['bar'], { foo: 43 }, { skip: true })).toEqual([
      ['bar'],
      { foo: 43 },
      { skip: true },
    ]);
  });
});

describe('on', () => {
  const foo = () => {};
  test('provider_only', () => {
    expect(validateOn(foo)).toEqual([[], foo]);
  });

  test('string_path_provider', () => {
    expect(validateOn('abc', foo)).toEqual([['abc'], foo]);
  });

  test('empty_string_path_provider', () => {
    expect(validateOn('', foo)).toEqual([[], foo]);
  });

  test('array_path_provider', () => {
    expect(validateOn(['abc'], foo)).toEqual([['abc'], foo]);
  });

  test('empty_array_path_provider', () => {
    expect(validateOn([], foo)).toEqual([[], foo]);
  });
});
