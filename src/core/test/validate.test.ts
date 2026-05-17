import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { validateCall, validateOn } from '../validate.ts';

describe('call', () => {
  test('one-arg', () => {
    assert.deepStrictEqual(validateCall({ foo: 43 }), [[], { foo: 43 }, {}]);
  });

  test('string_path_payload', () => {
    assert.deepStrictEqual(validateCall('bar.baz', { foo: 43 }), [
      ['bar', 'baz'],
      { foo: 43 },
      {},
    ]);
  });

  test('array_path_payload', () => {
    assert.deepStrictEqual(validateCall(['bar'], { foo: 43 }), [
      ['bar'],
      { foo: 43 },
      {},
    ]);
  });

  test('payload_options', () => {
    assert.deepStrictEqual(validateCall({ foo: 43 }, { skip: true }), [
      [],
      { foo: 43 },
      { skip: true },
    ]);
  });

  test('all_empty_string_path', () => {
    assert.deepStrictEqual(validateCall('', { foo: 43 }, { skip: true }), [
      [],
      { foo: 43 },
      { skip: true },
    ]);
  });

  test('all_empty_array_path', () => {
    assert.deepStrictEqual(validateCall([], { foo: 43 }, { skip: true }), [
      [],
      { foo: 43 },
      { skip: true },
    ]);
  });

  test('all_string_path', () => {
    assert.deepStrictEqual(
      validateCall('bar.baz', { foo: 43 }, { skip: true }),
      [['bar', 'baz'], { foo: 43 }, { skip: true }],
    );
  });

  test('all_array_path', () => {
    assert.deepStrictEqual(validateCall(['bar'], { foo: 43 }, { skip: true }), [
      ['bar'],
      { foo: 43 },
      { skip: true },
    ]);
  });
});

describe('on', () => {
  const foo = () => {};
  test('provider_only', () => {
    assert.deepStrictEqual(validateOn(foo), [[], foo]);
  });

  test('string_path_provider', () => {
    assert.deepStrictEqual(validateOn('abc', foo), [['abc'], foo]);
  });

  test('empty_string_path_provider', () => {
    assert.deepStrictEqual(validateOn('', foo), [[], foo]);
  });

  test('array_path_provider', () => {
    assert.deepStrictEqual(validateOn(['abc'], foo), [['abc'], foo]);
  });

  test('empty_array_path_provider', () => {
    assert.deepStrictEqual(validateOn([], foo), [[], foo]);
  });
});
