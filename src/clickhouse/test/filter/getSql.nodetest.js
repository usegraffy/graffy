import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import getSql from '../../filter/getSql.js';

const opt = (types) => ({ schema: { types } });

describe('clickhouse_filter_sql', () => {
  test('simple equals', () => {
    assert.strictEqual(getSql({ foo: 5 }, opt({ foo: 'Int64' })), '`foo` = 5');
  });

  test('dot path equals string', () => {
    assert.ok(
      getSql(
        { 'sources.messageId': 'abc' },
        opt({ sources: 'String' }),
      ).includes(
        "JSONExtractString(ifNull(`sources`, '{}'), 'messageId') = 'abc'",
      ),
    );
  });

  test('map dot path equals string', () => {
    assert.ok(
      getSql(
        { 'recordIds.gmailMessageId': 'abc' },
        opt({ recordIds: 'Map(LowCardinality(String), String)' }),
      ).includes(
        "if(mapContains(`recordIds`, 'gmailMessageId'), `recordIds`['gmailMessageId'], NULL) = 'abc'",
      ),
    );
  });

  test('dot path null uses missing-key semantics', () => {
    assert.ok(
      getSql(
        { 'sources.messageId': null },
        opt({ sources: 'String' }),
      ).includes(
        "isNull(nullIf(JSONExtractRaw(ifNull(`sources`, '{}'), 'messageId'), ''))",
      ),
    );

    assert.ok(
      getSql(
        { 'sources.messageId': { $not: null } },
        opt({ sources: 'String' }),
      ).includes(
        "NOT (isNull(nullIf(JSONExtractRaw(ifNull(`sources`, '{}'), 'messageId'), '')))",
      ),
    );
  });

  test('ire uses case-insensitive regex', () => {
    assert.ok(
      getSql(
        { lookup: { $ire: '^ab' } },
        opt({ lookup: 'Nullable(String)' }),
      ).includes("match(ifNull(`lookup`, ''), concat('(?i)', '^ab'))"),
    );
  });

  test('cts on array of objects', () => {
    const result = getSql(
      { participants: { $cts: [{ address: 'foo@bar.com' }] } },
      opt({ participants: 'Nullable(String)' }),
    );
    assert.ok(result.includes('arrayExists('));
    assert.ok(
      result.includes("JSONExtractArrayRaw(ifNull(`participants`, '[]'))"),
    );
    assert.ok(
      result.includes("JSONExtractRaw(item, 'address') = '\"foo@bar.com\"'"),
    );
  });

  test('join subquery equality', () => {
    const result = getSql(
      { posts: { title: 'Extra bar' } },
      {
        idCol: 'id',
        schema: {
          types: {
            id: 'String',
            email: 'String',
          },
        },
        joins: {
          posts: {
            table: 'posts',
            idCol: 'id',
            refCol: 'authorId',
            database: 'default',
            schema: {
              types: {
                id: 'String',
                authorId: 'String',
                title: 'String',
              },
            },
            joins: {},
          },
        },
      },
    );

    assert.ok(
      result.includes('`id` IN (SELECT `authorId` FROM `default`.`posts`'),
    );
    assert.ok(result.includes("WHERE `title` = 'Extra bar'"));
  });

  test('join subquery and root filter combination', () => {
    const result = getSql(
      { email: 'a', posts: { title: { $ire: 'foo' } } },
      {
        idCol: 'id',
        schema: {
          types: {
            id: 'String',
            email: 'String',
          },
        },
        joins: {
          posts: {
            table: 'posts',
            idCol: 'id',
            refCol: 'authorId',
            database: 'default',
            schema: {
              types: {
                id: 'String',
                authorId: 'String',
                title: 'String',
              },
            },
            joins: {},
          },
        },
      },
    );

    assert.ok(result.includes("`email` = 'a'"));
    assert.ok(
      result.includes("match(ifNull(`title`, ''), concat('(?i)', 'foo'))"),
    );
    assert.ok(
      result.includes('`id` IN (SELECT `authorId` FROM `default`.`posts`'),
    );
  });

  test('join explicit $and stays inside one subquery', () => {
    const result = getSql(
      {
        posts: {
          $and: [{ title: 'Extra bar' }, { title: { $ire: 'foo' } }],
        },
      },
      {
        idCol: 'id',
        schema: {
          types: {
            id: 'String',
          },
        },
        joins: {
          posts: {
            table: 'posts',
            idCol: 'id',
            refCol: 'authorId',
            database: 'default',
            schema: {
              types: {
                id: 'String',
                authorId: 'String',
                title: 'String',
              },
            },
            joins: {},
          },
        },
      },
    );

    assert.ok(
      result.includes(
        '`id` IN (SELECT `authorId` FROM `default`.`posts` WHERE',
      ),
    );
    assert.ok(result.includes("`title` = 'Extra bar'"));
    assert.ok(
      result.includes("match(ifNull(`title`, ''), concat('(?i)', 'foo'))"),
    );
    assert.strictEqual(
      (result.match(/SELECT `authorId` FROM/g) || []).length,
      1,
    );
  });

  test('join_subquery_respects_explicit_final_opt_in', () => {
    const result = getSql(
      { posts: { title: 'Extra bar' } },
      {
        idCol: 'id',
        schema: {
          types: {
            id: 'String',
          },
        },
        joins: {
          posts: {
            table: 'posts',
            idCol: 'id',
            refCol: 'authorId',
            database: 'default',
            final: true,
            schema: {
              types: {
                id: 'String',
                authorId: 'String',
                title: 'String',
              },
            },
            joins: {},
          },
        },
      },
    );

    assert.ok(
      result.includes(
        '`id` IN (SELECT `authorId` FROM `default`.`posts` FINAL',
      ),
    );
  });
});
