import sql, { join, raw } from 'sql-template-tag';
import getSql from '../../filter/getSql.js';

const lookup = (str) => sql`"${raw(str)}"`;

test('simple', () => {
  expect(getSql({ foo: 5 }, lookup)).toEqual(sql`"foo" = ${5}`);
});

test('simple_logic', () => {
  expect(getSql({ foo: { $gt: 5, $lt: 6 } }, lookup)).toEqual(
    sql`("foo" > ${5}) AND ("foo" < ${6})`,
  );
});

test('or', () => {
  expect(getSql({ foo: [5, 6] }, lookup)).toEqual(
    sql`"foo" IN (${join([5, 6])})`,
  );
});

test('or_root', () => {
  expect(getSql([{ foo: 6 }, { bar: 7 }], lookup)).toEqual(
    sql`("foo" = ${6}) OR ("bar" = ${7})`,
  );
});

test('not', () => {
  expect(getSql({ foo: { $not: 6 } }, lookup)).toEqual(sql`"foo" <> ${6}`);
});

test('not_or', () => {
  expect(getSql({ foo: { $not: [5, { $gt: 6 }] } }, lookup)).toEqual(
    sql`NOT (("foo" = ${5}) OR ("foo" > ${6}))`,
  );
});

test('logic_inversion', () => {
  expect(
    getSql(
      { $and: [{ $or: { foo: 5, bar: 6 } }, { $or: { baz: 7, qux: 4 } }] },
      lookup,
    ),
  ).toEqual(
    sql`(("foo" = ${5}) OR ("bar" = ${6})) AND (("baz" = ${7}) OR ("qux" = ${4}))`,
  );
});

// TODO: $any, $and and $has should have different cases based on
// column type (array vs. json)

test('any_ovl', () => {
  expect(getSql({ tags: { $any: 'foo' } }, lookup)).toEqual(
    sql`"tags" ?| ${['foo']}`,
  );
});

test('all_ctd', () => {
  expect(getSql({ tags: { $all: ['foo', 'bar', 'baz'] } }, lookup)).toEqual(
    sql`"tags" <@ ${['foo', 'bar', 'baz']}`,
  );
});

test('has_cts', () => {
  expect(getSql({ tags: { $has: ['foo', 'bar'] } }, lookup)).toEqual(
    sql`"tags" @> ${['foo', 'bar']}`,
  );
});

test('any', () => {
  expect(getSql({ tags: { $any: { $gte: 'm' } } }, lookup)).toEqual(
    sql`(SELECT bool_or("el$0" >= ${'m'}) FROM UNNEST("tags") "el$0")`,
  );
});

test('has', () => {
  expect(
    getSql({ tags: { $has: [{ $gte: 'm' }, { $lt: 'b' }] } }, lookup),
  ).toEqual(
    sql`(SELECT bool_or("el$0" >= ${'m'}) AND bool_or("el$0" < ${'b'}) FROM UNNEST("tags") "el$0")`,
  );
});

test('all', () => {
  expect(getSql({ tags: { $all: { $gte: 'm' } } }, lookup)).toEqual(
    sql`(SELECT bool_and("el$0" >= ${'m'}) FROM UNNEST("tags") "el$0")`,
  );
});

test('cts', () => {
  expect(
    getSql({ emails: { $cts: { 'foo@bar.com': ['work'] } } }, lookup),
  ).toEqual(sql`"emails" @> ${{ 'foo@bar.com': ['work'] }}`);
});

test('ctd', () => {
  expect(
    getSql({ emails: { $ctd: { 'foo@bar.com': ['work'] } } }, lookup),
  ).toEqual(sql`"emails" <@ ${{ 'foo@bar.com': ['work'] }}`);
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
