import { selectByArgs, selectByIds } from '../../sql/select.js';

function normalize(sql) {
  return sql
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),])\s*/g, '$1');
}

describe('clickhouse_select_sql', () => {
  const options = {
    table: 'user',
    idCol: 'id',
    verCol: 'updatedAt',
    schema: {
      types: {
        id: 'String',
        updatedAt: 'Int64',
        isDeleted: 'UInt8',
        participants: 'Nullable(String)',
      },
    },
    final: true,
  };

  test('selectByArgs_first_order', () => {
    const { sql } = selectByArgs(
      {
        $order: ['id'],
        $first: 10,
        isDeleted: false,
      },
      null,
      options,
    );

    expect(normalize(sql)).toEqual(
      normalize(`
        SELECT * FROM \`default\`.\`user\` FINAL
        WHERE \`isDeleted\` = 0
        ORDER BY \`id\` ASC
        LIMIT 10
      `),
    );
  });

  test('selectByIds', () => {
    const { sql } = selectByIds(['a', 'b'], options);
    expect(normalize(sql)).toEqual(
      normalize(`
        SELECT * FROM \`default\`.\`user\` FINAL
        WHERE \`id\` IN ('a', 'b')
      `),
    );
  });

  test('aggregate_group_true_count_and_sum', () => {
    const selection = selectByArgs(
      {
        $group: true,
        isDeleted: false,
      },
      {
        $count: true,
        $sum: {
          'participants.0.count': true,
        },
      },
      options,
    );

    expect(selection.isAggregate).toEqual(true);
    expect(selection.groupSpec).toEqual(true);
    expect(normalize(selection.sql)).toContain(
      normalize(`
        SELECT count() AS \`$count\`, sum(
          toFloat64OrZero(
            JSONExtractString(ifNull(\`participants\`, '{}'), '0', 'count')
          )
        ) AS \`__agg_0\`
      `),
    );
    expect(normalize(selection.sql)).toContain(
      normalize(`
        FROM \`default\`.\`user\` FINAL
        WHERE \`isDeleted\` = 0
        LIMIT 1
      `),
    );
  });

  test('aggregate_grouped_with_range', () => {
    const selection = selectByArgs(
      {
        $group: ['isDeleted'],
        $all: true,
      },
      {
        $count: true,
        $avg: {
          updatedAt: true,
        },
        $max: {
          updatedAt: true,
        },
        $min: {
          updatedAt: true,
        },
        $card: {
          id: true,
        },
      },
      options,
    );

    expect(selection.isAggregate).toEqual(true);
    expect(selection.groupSpec).toEqual(['isDeleted']);
    expect(selection.aggregateAliases).toEqual({
      __agg_0: { op: '$avg', prop: 'updatedAt' },
      __agg_1: { op: '$max', prop: 'updatedAt' },
      __agg_2: { op: '$min', prop: 'updatedAt' },
      __agg_3: { op: '$card', prop: 'id' },
    });
    expect(normalize(selection.sql)).toContain(
      normalize(`
        SELECT
        \`isDeleted\` AS \`__group_0\`,
        count() AS \`$count\`,
        avg(toFloat64OrZero(\`updatedAt\`)) AS \`__agg_0\`,
        max(toFloat64OrZero(\`updatedAt\`)) AS \`__agg_1\`,
        min(toFloat64OrZero(\`updatedAt\`)) AS \`__agg_2\`,
        uniqExact(\`id\`) AS \`__agg_3\`
      `),
    );
    expect(normalize(selection.sql)).toContain('GROUP BY `isDeleted`');
    expect(normalize(selection.sql)).toContain('LIMIT 4096');
  });

  test('aggregate_all_ops_in_single_query', () => {
    const selection = selectByArgs(
      {
        $group: true,
        isDeleted: false,
      },
      {
        $count: true,
        $sum: { updatedAt: true, 'participants.0.count': true },
        $avg: { updatedAt: true },
        $max: { updatedAt: true },
        $min: { updatedAt: true },
        $card: { id: true },
      },
      options,
    );

    expect(selection.isAggregate).toEqual(true);
    expect(selection.groupSpec).toEqual(true);
    expect(selection.aggregateAliases).toEqual({
      __agg_0: { op: '$sum', prop: 'updatedAt' },
      __agg_1: { op: '$sum', prop: 'participants.0.count' },
      __agg_2: { op: '$avg', prop: 'updatedAt' },
      __agg_3: { op: '$max', prop: 'updatedAt' },
      __agg_4: { op: '$min', prop: 'updatedAt' },
      __agg_5: { op: '$card', prop: 'id' },
    });
    expect(normalize(selection.sql)).toContain(
      normalize('count() AS `$count`'),
    );
    expect(normalize(selection.sql)).toContain(
      normalize('sum(toFloat64OrZero(`updatedAt`)) AS `__agg_0`'),
    );
    expect(normalize(selection.sql)).toContain(
      normalize(
        "sum(toFloat64OrZero(JSONExtractString(ifNull(`participants`,'{}'),'0','count'))) AS `__agg_1`",
      ),
    );
    expect(normalize(selection.sql)).toContain(
      normalize('avg(toFloat64OrZero(`updatedAt`)) AS `__agg_2`'),
    );
    expect(normalize(selection.sql)).toContain(
      normalize('max(toFloat64OrZero(`updatedAt`)) AS `__agg_3`'),
    );
    expect(normalize(selection.sql)).toContain(
      normalize('min(toFloat64OrZero(`updatedAt`)) AS `__agg_4`'),
    );
    expect(normalize(selection.sql)).toContain(
      normalize('uniqExact(`id`) AS `__agg_5`'),
    );
  });
});
