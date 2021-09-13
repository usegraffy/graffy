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

test('any_ovl', () => {
  expect(getAst({ tags: { $any: 'foo' } })).toEqual(['$ovl', 'tags', ['foo']]);
});

test('all_ctd', () => {
  expect(getAst({ tags: { $all: ['foo', 'bar', 'baz'] } })).toEqual([
    '$ctd',
    'tags',
    ['foo', 'bar', 'baz'],
  ]);
});

test('has_cts', () => {
  expect(getAst({ tags: { $has: ['foo', 'bar'] } })).toEqual([
    '$cts',
    'tags',
    ['foo', 'bar'],
  ]);
});

test('any', () => {
  expect(getAst({ tags: { $any: { $gte: 'm' } } })).toEqual([
    '$any',
    'tags',
    'el$0',
    ['$gte', 'el$0', 'm'],
  ]);
});

test('has', () => {
  expect(getAst({ tags: { $has: [{ $gte: 'm' }, { $lt: 'b' }] } })).toEqual([
    '$has',
    'tags',
    'el$0',
    [
      ['$gte', 'el$0', 'm'],
      ['$lt', 'el$0', 'b'],
    ],
  ]);
});

test('all', () => {
  expect(getAst({ tags: { $all: { $gte: 'm' } } })).toEqual([
    '$all',
    'tags',
    'el$0',
    ['$gte', 'el$0', 'm'],
  ]);
});

/*
### Basic

{ foo: 5 }
['$and', [['$eq', 'foo', 5]]]
  - Simplify: $and with one limb
['$eq', 'foo', 5]

{ foo: { $gt: 5, $lt: 6 } }
['$and', [['$and', [['$gt', 'foo', 5], ['$lt', 'foo', 6]] ]] ]
  - Simplify: $and with one limb

### Or

{ foo: [5, 6] }
['$and', [['$or', [['$eq', 'foo', 5], ['$eq', 'foo', 6]]]]]
  - Simplify: multiple $eq limbs in $or with same prop -> $in
  - Simplify: $or with one limb
  - Simplify: $and with one limb
['$in', 'foo', [5, 6]]

{ foo: [ 5, { $gt: 6 } ] }
['$and', [['$or', [['$eq', 'foo', 5], ['$gt', 'foo', 6]]]]]
  - Simplify: $and with one limb
['$or', [['$eq', 'foo', 5], ['$gt', 'foo', 6]]]

[ { foo: 6 }, { bar: 7 } ]
['$or', [['$eq', 'foo', 6], ['$eq', 'bar', 7]]]

### Not

{ foo: { $not: 6 } }
['$and', [['$not', ['$eq', 'foo', '6']]]]
  - Simplify: $not with $eq -> $neq
  - Simplify: $and with one limb
['$neq', 'foo', 6]


{ foo: { $not: [5, 6] }
['$and', [['$not', ['$or', [['$eq', 'foo', '6'], ['$eq', 'foo', 6]] ] ]] ]
  - Simplify: multiple $eq limbs in $or with same prop -> $in
  - Simplify: $or with one limb
  - Simplify: $not with $in -> $nin
  - Simplify: $and with one limb
['$nin', 'foo', [5, 6]]


{ foo: { $not: [ 5, { $gt: 6 } ] } }
['$and', [['$not', ['$or', [['$eq', 'foo', '6'], ['$gt', 'foo', 6]] ] ]] ]
  - Simplify: $and with one limb
['$not', ['$or', [['$eq', 'foo', 5], ['$gt', 'foo', 6]] ] ]

### Logic

{ $and: [ { $or: { foo: 5, bar: 6 } }, { $or: { baz: 7, qux: 4 } } ] }

['$and', [['$and', [
  ['$or', [['$eq', 'foo', 5], ['$eq', 'bar', 6]] ],
  ['$or', [['$eq', 'baz', 7], ['$eq', 'qux', 4]] ]
] ]] ]
  - Simplify: $and with one limb


### Collections

{ tags: { $any: 'foo' } }
['$and', [['$and', [['$any', 'tags', 'el$0', ['$eq', 'el$0', 'foo'] ]] ]] ]
  - Simplify: $any with $eq -> $ovp
  - Simplify: $and with one limb
  - Simplify: $and with one limb
['$ovp', 'tags', ['foo']]

{ tags: { $any: ['foo', 'bar'] } }
['$and', [['$and', [['$any', 'tags', 'el$0', ['$or', [
  ['$eq', 'el$0', 'foo'], ['$eq', 'el$0', 'bar']
]] ]] ]] ]
  - Simplify: multiple $eq limbs in $or with same prop -> $in
  - Simplify: $any with $in -> $ovp
  - Simplify: $and with one limb
  - Simplify: $and with one limb
['$ovp', 'tags', ['foo', 'bar']]


{ tags: { $has: ['foo', 'bar'] } }
['$and', [['$and', [[
  '$has', 'tags', 'el$0', ['$eq', 'el$0', 'foo'], ['$eq', 'el$0', 'bar']
]] ]] ]
  - Important: The array after $has is expanded in-place and not nested in $or
  - Simplify: $has with only $eq -> $cts
  - Simplify: $and with one limb
  - Simplify: $and with one limb
['$cts', 'tags', ['foo', 'bar']]

{ tags: { $all: ['foo', 'bar', 'baz'] } }
['$and', [['$and', [['ALL', 'tags', 'el$0', ['$or', [
  ['$eq', 'el$0', 'foo'], ['$eq', 'el$0', 'bar'], ['$eq', 'el$0', 'baz']
]] ]] ]] ]
  - Simplify: multiple $eq limbs in $or with same prop -> $in
  - Simplify: ALL with $in -> $ctd
  - Simplify: $and with one limb
  - Simplify: $and with one limb
['$ctd', 'tags', ['foo', 'bar', 'baz']]

{ tags: { $any: { $gte: 'm' } } }
['$and', [['$and', [['$any', 'tags', 'el$0', ['$and', [['$gte', 'el$0', 'm']] ] ]] ]] ]
  - Simplify: $and with one limb
  - Simplify: $and with one limb
  - Simplify: $and with one limb
['$any', 'tags', 'el$0', ['$gte', 'el$0', 'm']]
  - Generates: (SELECT bool_or(el >= 'm') FROM UNNEST(tags) AS t(el))

{ tags: { $has: [{ $gte: 'm' }, { $lt: b }] } }
  - Generates: (SELECT bool_or(el >= 'm') AND bool_or(el < 'b') FROM UNNEST(tags) AS t(el))

{ tags: { $all: { $gte: 'm' } } }
  - Generates: (SELECT bool_and(el >= 'm') FROM UNNEST(tags) AS t(el))`
*/
