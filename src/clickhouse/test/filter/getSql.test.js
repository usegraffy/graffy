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
});
