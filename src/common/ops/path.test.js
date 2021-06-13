import { wrap, unwrap, remove } from './path.js';
import { encodeArgs } from '../coding/index.js';

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

describe('wrap', () => {
  test('range_path', () => {
    const qNode = encodeArgs({ $first: 10, foo: 42 });
    const eNode = encodeArgs({ $first: 10, foo: 42, bar: 33 });
    // console.log(qNode);
    expect(wrap([qNode], ['bar', { bar: 33, $all: true }])).toEqual([
      {
        key: 'bar',
        version: 0,
        children: [eNode],
      },
    ]);
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
