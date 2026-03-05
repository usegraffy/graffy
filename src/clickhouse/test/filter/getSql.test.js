import getSql from '../../filter/getSql.js';

const opt = (types) => ({ schema: { types } });

describe('clickhouse_filter_sql', () => {
  test('simple equals', () => {
    expect(getSql({ foo: 5 }, opt({ foo: 'Int64' }))).toEqual('`foo` = 5');
  });

  test('dot path equals string', () => {
    expect(
      getSql({ 'sources.messageId': 'abc' }, opt({ sources: 'String' })),
    ).toContain(
      "JSONExtractString(ifNull(`sources`, '{}'), 'messageId') = 'abc'",
    );
  });

  test('dot path null uses missing-key semantics', () => {
    expect(
      getSql({ 'sources.messageId': null }, opt({ sources: 'String' })),
    ).toContain(
      "isNull(nullIf(JSONExtractRaw(ifNull(`sources`, '{}'), 'messageId'), ''))",
    );

    expect(
      getSql(
        { 'sources.messageId': { $not: null } },
        opt({ sources: 'String' }),
      ),
    ).toContain(
      "NOT (isNull(nullIf(JSONExtractRaw(ifNull(`sources`, '{}'), 'messageId'), '')))",
    );
  });

  test('ire uses case-insensitive regex', () => {
    expect(
      getSql({ lookup: { $ire: '^ab' } }, opt({ lookup: 'Nullable(String)' })),
    ).toContain("match(ifNull(`lookup`, ''), concat('(?i)', '^ab'))");
  });

  test('cts on array of objects', () => {
    const sql = getSql(
      { participants: { $cts: [{ address: 'foo@bar.com' }] } },
      opt({ participants: 'Nullable(String)' }),
    );
    expect(sql).toContain('arrayExists(');
    expect(sql).toContain("JSONExtractArrayRaw(ifNull(`participants`, '[]'))");
    expect(sql).toContain(
      "JSONExtractRaw(item, 'address') = '\"foo@bar.com\"'",
    );
  });

  test('join subquery equality', () => {
    const sql = getSql(
      { posts: { title: 'Extra bar' } },
      {
        idCol: 'id',
        schema: {
          types: {
            id: 'String',
            email: 'String',
            _sign: 'Int8',
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
                _sign: 'Int8',
              },
            },
            joins: {},
          },
        },
      },
    );

    expect(sql).toContain(
      '`id` IN (SELECT `authorId` FROM `default`.`posts` FINAL',
    );
    expect(sql).toContain("`_sign` = 1 AND `title` = 'Extra bar'");
  });

  test('join subquery and root filter combination', () => {
    const sql = getSql(
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

    expect(sql).toContain("`email` = 'a'");
    expect(sql).toContain("match(ifNull(`title`, ''), concat('(?i)', 'foo'))");
    expect(sql).toContain(
      '`id` IN (SELECT `authorId` FROM `default`.`posts` FINAL',
    );
  });

  test('join explicit $and stays inside one subquery', () => {
    const sql = getSql(
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

    expect(sql).toContain(
      '`id` IN (SELECT `authorId` FROM `default`.`posts` FINAL WHERE',
    );
    expect(sql).toContain("`title` = 'Extra bar'");
    expect(sql).toContain("match(ifNull(`title`, ''), concat('(?i)', 'foo'))");
    expect((sql.match(/SELECT `authorId` FROM/g) || []).length).toEqual(1);
  });
});
