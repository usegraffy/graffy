import getAst from '../../filter/getAst.js';

test('simple', () => {
  expect(getAst({ foo: 5 })).toEqual(['$eq', 'foo', 5]);
});

test('simple_logic', () => {
  expect(getAst({ foo: { $gt: 5, $lt: 6 } })).toEqual([
    '$and',
    [
      ['$gt', 'foo', 5],
      ['$lt', 'foo', 6],
    ],
  ]);
});

test('or', () => {
  expect(getAst({ foo: [5, 6] })).toEqual(['$in', 'foo', [5, 6]]);
});

test('or_root', () => {
  expect(getAst([{ foo: 6 }, { bar: 7 }])).toEqual([
    '$or',
    [
      ['$eq', 'foo', 6],
      ['$eq', 'bar', 7],
    ],
  ]);
});

test('not', () => {
  expect(getAst({ foo: { $not: 6 } })).toEqual(['$neq', 'foo', 6]);
});

test('not_or', () => {
  expect(getAst({ foo: { $not: [5, { $gt: 6 }] } })).toEqual([
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
  expect(
    getAst({
      $and: [{ $or: { foo: 5, bar: 6 } }, { $or: { baz: 7, qux: 4 } }],
    }),
  ).toEqual([
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
  ]);
});
