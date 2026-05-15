import { test } from 'node:test';
import sql, { join } from 'sql-template-tag';
import getSql from '../../filter/getSql.js';
import expectSql from '../assertSql.js';

const opt = (types) => ({ schema: { types } });

test('simple', () => {
  expectSql(getSql({ foo: 5 }, opt({ foo: 'int8' })), sql`"foo" = ${5}`);
});

test('simple_logic', () => {
  expectSql(
    getSql({ foo: { $gt: 5, $lt: 6 } }, opt({ foo: 'int8' })),
    sql`("foo" > ${5}) AND ("foo" < ${6})`,
  );
});

test('or', () => {
  expectSql(
    getSql({ foo: [5, 6] }, opt({ foo: 'int8' })),
    sql`"foo" IN (${join([5, 6])})`,
  );
});

test('or_root', () => {
  expectSql(
    getSql([{ foo: 6 }, { bar: 7 }], opt({ foo: 'int8', bar: 'int4' })),
    sql`("foo" = ${6}) OR ("bar" = ${7})`,
  );
});

test('not', () => {
  expectSql(
    getSql({ foo: { $not: 6 } }, opt({ foo: 'int8' })),
    sql`"foo" <> ${6}`,
  );
});

test('not_or', () => {
  expectSql(
    getSql({ foo: { $not: [5, { $gt: 6 }] } }, opt({ foo: 'int8' })),
    sql`NOT (("foo" = ${5}) OR ("foo" > ${6}))`,
  );
});

test('logic_inversion', () => {
  expectSql(
    getSql(
      { $and: [{ $or: { foo: 5, bar: 6 } }, { $or: { baz: 7, qux: 4 } }] },
      opt({ foo: 'int8', bar: 'int8', baz: 'int8', qux: 'int8' }),
    ),
    sql`(("foo" = ${5}) OR ("bar" = ${6})) AND (("baz" = ${7}) OR ("qux" = ${4}))`,
  );
});

test('cts', () => {
  expectSql(
    getSql(
      { emails: { $cts: { 'foo@bar.com': ['work'] } } },
      opt({ emails: 'jsonb' }),
    ),
    sql`"emails" @> ${JSON.stringify({ 'foo@bar.com': ['work'] })}::jsonb`,
  );
});

test('ctd', () => {
  expectSql(
    getSql(
      { emails: { $ctd: { 'foo@bar.com': ['work'] } } },
      opt({ emails: 'jsonb' }),
    ),
    sql`"emails" <@ ${JSON.stringify({ 'foo@bar.com': ['work'] })}::jsonb`,
  );
});

test('regex jsonb', () => {
  expectSql(
    getSql({ 'data.Name': { $re: 'abc' } }, opt({ data: 'jsonb' })),
    sql`"data" #>> ${['Name']} ~ ${'abc'}`,
  );
});

test('regex text', () => {
  expectSql(
    getSql({ name: { $re: 'abc' } }, opt({ name: 'text' })),
    sql`"name" ~ ${'abc'}`,
  );
});

test('jsonb eq number', () => {
  expectSql(
    getSql({ 'data.Score': 3 }, opt({ data: 'jsonb' })),
    sql`"data" #> ${['Score']} = ${'3'}::jsonb`,
  );
});

test('jsonb eq text', () => {
  expectSql(
    getSql({ 'data.Name': 'Bob' }, opt({ data: 'jsonb' })),
    sql`"data" #>> ${['Name']} = ${'Bob'}`,
  );
});

test('join', () => {
  expectSql(
    getSql(
      { posts: { category: 'programming' } },
      {
        idCol: 'id',
        schema: { types: { id: 'uuid' } },
        joins: {
          posts: {
            table: 'posts',
            refCol: 'authorId',
            schema: { types: { category: 'text', authorId: 'text' } },
          },
        },
      },
    ),
    sql`"id" IN (SELECT "authorId"::uuid FROM "posts" WHERE "category" = ${'programming'})`,
  );
});

test('join with multiple col', () => {
  expectSql(
    getSql(
      { posts: { category: 'programming', authorId: 'id1' } },
      {
        idCol: 'id',
        schema: { types: { id: 'uuid' } },
        joins: {
          posts: {
            table: 'posts',
            refCol: 'authorId',
            schema: { types: { category: 'text', authorId: 'text' } },
          },
        },
      },
    ),
    sql`"id" IN (SELECT "authorId"::uuid FROM "posts" WHERE ("category" = ${'programming'}) AND ("authorId" = ${'id1'}))`,
  );
});

test('keycts', () => {
  const value = ['foo@bar.com', 'foo@baz.com'];
  expectSql(
    getSql(
      { emails: { $keycts: ['foo@bar.com', 'foo@baz.com'] } },
      opt({ emails: 'jsonb' }),
    ),
    sql`"emails" ?| ${value}::text[]`,
  );
});

test('keyctd', () => {
  const value = ['foo@bar.com', 'foo@baz.com'];
  expectSql(
    getSql(
      { emails: { $keyctd: ['foo@bar.com', 'foo@baz.com'] } },
      opt({ emails: 'jsonb' }),
    ),
    sql`"emails" ?& ${value}::text[]`,
  );
});
