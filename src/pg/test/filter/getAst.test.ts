import assert from 'node:assert/strict';
import { test } from 'node:test';
import getAst from '../../filter/getAst.ts';

test('simple', () => {
  assert.deepStrictEqual(getAst({ foo: 5 }), ['$eq', 'foo', 5]);
});

test('simple_logic', () => {
  assert.deepStrictEqual(getAst({ foo: { $gt: 5, $lt: 6 } }), [
    '$and',
    [
      ['$gt', 'foo', 5],
      ['$lt', 'foo', 6],
    ],
  ]);
});

test('or', () => {
  assert.deepStrictEqual(getAst({ foo: [5, 6] }), ['$in', 'foo', [5, 6]]);
});

test('or_root', () => {
  assert.deepStrictEqual(getAst([{ foo: 6 }, { bar: 7 }]), [
    '$or',
    [
      ['$eq', 'foo', 6],
      ['$eq', 'bar', 7],
    ],
  ]);
});

test('not', () => {
  assert.deepStrictEqual(getAst({ foo: { $not: 6 } }), ['$neq', 'foo', 6]);
});

test('not_or', () => {
  assert.deepStrictEqual(getAst({ foo: { $not: [5, { $gt: 6 }] } }), [
    '$not',
    [
      '$or',
      [
        ['$eq', 'foo', 5],
        ['$gt', 'foo', 6],
      ],
    ],
  ]);
});

test('logic_inversion', () => {
  assert.deepStrictEqual(
    getAst({
      $and: [{ $or: { foo: 5, bar: 6 } }, { $or: { baz: 7, qux: 4 } }],
    }),
    [
      '$and',
      [
        [
          '$or',
          [
            ['$eq', 'foo', 5],
            ['$eq', 'bar', 6],
          ],
        ],
        [
          '$or',
          [
            ['$eq', 'baz', 7],
            ['$eq', 'qux', 4],
          ],
        ],
      ],
    ],
  );
});

test('in_null', () => {
  assert.deepStrictEqual(
    getAst({
      foo: [null, 1, 2, 3],
    }),
    [
      '$or',
      [
        ['$eq', 'foo', null],
        ['$in', 'foo', [1, 2, 3]],
      ],
    ],
  );
});

test('nin_null', () => {
  assert.deepStrictEqual(
    getAst({
      foo: { $not: [null, 1, 2, 3] },
    }),
    [
      '$not',
      [
        '$or',
        [
          ['$eq', 'foo', null],
          ['$in', 'foo', [1, 2, 3]],
        ],
      ],
    ],
  );
});
