import sql, { join } from 'sql-template-tag';
import getSql from '../../filter/getSql.js';

const opt = (types) => ({ schema: { types } });

test('simple', () => {
  expect(getSql({ foo: 5 }, opt({ foo: 'int8' }))).toEqual(sql`"foo" = ${5}`);
});

test('simple_logic', () => {
  expect(getSql({ foo: { $gt: 5, $lt: 6 } }, opt({ foo: 'int8' }))).toEqual(
    sql`("foo" > ${5}) AND ("foo" < ${6})`,
  );
});

test('or', () => {
  expect(getSql({ foo: [5, 6] }, opt({ foo: 'int8' }))).toEqual(
    sql`"foo" IN (${join([5, 6])})`,
  );
});

test('or_root', () => {
  expect(
    getSql([{ foo: 6 }, { bar: 7 }], opt({ foo: 'int8', bar: 'int4' })),
  ).toEqual(sql`("foo" = ${6}) OR ("bar" = ${7})`);
});

test('not', () => {
  expect(getSql({ foo: { $not: 6 } }, opt({ foo: 'int8' }))).toEqual(
    sql`"foo" <> ${6}`,
  );
});

test('not_or', () => {
  expect(
    getSql({ foo: { $not: [5, { $gt: 6 }] } }, opt({ foo: 'int8' })),
  ).toEqual(sql`NOT (("foo" = ${5}) OR ("foo" > ${6}))`);
});

test('logic_inversion', () => {
  expect(
    getSql(
      { $and: [{ $or: { foo: 5, bar: 6 } }, { $or: { baz: 7, qux: 4 } }] },
      opt({ foo: 'int8', bar: 'int8', baz: 'int8', qux: 'int8' }),
    ),
  ).toEqual(
    sql`(("foo" = ${5}) OR ("bar" = ${6})) AND (("baz" = ${7}) OR ("qux" = ${4}))`,
  );
});

test('cts', () => {
  expect(
    getSql(
      { emails: { $cts: { 'foo@bar.com': ['work'] } } },
      opt({ emails: 'jsonb' }),
    ),
  ).toEqual(
    sql`"emails" @> ${JSON.stringify({ 'foo@bar.com': ['work'] })}::jsonb`,
  );
});

test('ctd', () => {
  expect(
    getSql(
      { emails: { $ctd: { 'foo@bar.com': ['work'] } } },
      opt({ emails: 'jsonb' }),
    ),
  ).toEqual(
    sql`"emails" <@ ${JSON.stringify({ 'foo@bar.com': ['work'] })}::jsonb`,
  );
});

test('regex jsonb', () => {
  expect(
    getSql({ 'data.Name': { $re: 'abc' } }, opt({ data: 'jsonb' })),
  ).toEqual(sql`"data" #>> ${['Name']} ~ ${'abc'}`);
});

test('regex text', () => {
  expect(getSql({ name: { $re: 'abc' } }, opt({ name: 'text' }))).toEqual(
    sql`"name" ~ ${'abc'}`,
  );
});
