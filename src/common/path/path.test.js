import { unwrap, remove } from '.';

describe('unwrap', () => {
  test('root', () => {
    expect(unwrap([{ key: 'foo', value: '10' }], [])).toEqual([
      {
        key: 'foo',
        value: '10',
      },
    ]);
  });

  test('present', () => {
    expect(unwrap([{ key: 'foo', value: '10' }], ['foo'])).toEqual('10');
  });

  test('absent', () => {
    expect(unwrap([{ key: 'foo', end: 'gah' }], ['foo'])).toEqual(null);
  });

  test('unknown', () => {
    expect(unwrap([{ key: 'foo', value: '10' }], ['bar'])).toEqual(undefined);
  });
});

describe('remove', () => {
  test('last', () => {
    expect(remove([{ key: 'foo', value: '10' }], ['foo'])).toEqual([]);
  });

  test('miss', () => {
    expect(remove([{ key: 'foo', value: '10' }], ['bar'])).toEqual([
      { key: 'foo', value: '10' },
    ]);
  });

  test('not-last', () => {
    expect(
      remove(
        [
          { key: 'bar', value: '10' },
          { key: 'foo', value: '10' },
        ],
        ['foo'],
      ),
    ).toEqual([{ key: 'bar', value: '10' }]);
  });

  test('tree', () => {
    expect(
      remove(
        [
          {
            key: 'root',
            children: [
              { key: 'bar', value: '10' },
              { key: 'foo', value: '10' },
            ],
          },
        ],
        ['root', 'foo'],
      ),
    ).toEqual([{ key: 'root', children: [{ key: 'bar', value: '10' }] }]);
  });
});
