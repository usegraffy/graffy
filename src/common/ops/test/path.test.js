import { e } from '@graffy/testing/encoder.js';
import { remove, unwrap } from '../path.js';

describe('unwrap', () => {
  test('root', () => {
    expect(unwrap([{ key: e.foo, value: '10' }], [])).toEqual([
      {
        key: e.foo,
        value: '10',
      },
    ]);
  });

  test('present', () => {
    expect(unwrap([{ key: e.foo, value: '10' }], [e.foo])).toEqual('10');
  });

  test('absent', () => {
    expect(unwrap([{ key: e.foo, end: e.gah }], [e.foo])).toEqual(null);
  });

  test('unknown', () => {
    expect(unwrap([{ key: e.foo, value: '10' }], [e.bar])).toEqual(undefined);
  });
});

describe('remove', () => {
  test('last', () => {
    expect(remove([{ key: e.foo, value: '10' }], [e.foo])).toEqual([]);
  });

  test('miss', () => {
    expect(remove([{ key: e.foo, value: '10' }], [e.bar])).toEqual([
      { key: e.foo, value: '10' },
    ]);
  });

  test('not-last', () => {
    expect(
      remove(
        [
          { key: e.bar, value: '10' },
          { key: e.foo, value: '10' },
        ],
        [e.foo],
      ),
    ).toEqual([{ key: e.bar, value: '10' }]);
  });

  test('tree', () => {
    expect(
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
    ).toEqual([{ key: e.root, children: [{ key: e.bar, value: '10' }] }]);
  });
});
