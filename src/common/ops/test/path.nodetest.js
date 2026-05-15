import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { e } from '@graffy/testing/encoder.js';
import { remove, unwrap } from '../path.js';

describe('unwrap', () => {
  test('root', () => {
    assert.deepStrictEqual(unwrap([{ key: e.foo, value: '10' }], []), [
      {
        key: e.foo,
        value: '10',
      },
    ]);
  });

  test('present', () => {
    assert.deepStrictEqual(
      unwrap([{ key: e.foo, value: '10' }], [e.foo]),
      '10',
    );
  });

  test('absent', () => {
    assert.deepStrictEqual(unwrap([{ key: e.foo, end: e.gah }], [e.foo]), null);
  });

  test('unknown', () => {
    assert.deepStrictEqual(
      unwrap([{ key: e.foo, value: '10' }], [e.bar]),
      undefined,
    );
  });
});

describe('remove', () => {
  test('last', () => {
    assert.deepStrictEqual(remove([{ key: e.foo, value: '10' }], [e.foo]), []);
  });

  test('miss', () => {
    assert.deepStrictEqual(remove([{ key: e.foo, value: '10' }], [e.bar]), [
      { key: e.foo, value: '10' },
    ]);
  });

  test('not-last', () => {
    assert.deepStrictEqual(
      remove(
        [
          { key: e.bar, value: '10' },
          { key: e.foo, value: '10' },
        ],
        [e.foo],
      ),
      [{ key: e.bar, value: '10' }],
    );
  });

  test('tree', () => {
    assert.deepStrictEqual(
      remove(
        [
          {
            key: e.root,
            children: [
              { key: e.bar, value: '10' },
              { key: e.foo, value: '10' },
            ],
          },
        ],
        [e.root, e.foo],
      ),
      [{ key: e.root, children: [{ key: e.bar, value: '10' }] }],
    );
  });
});
