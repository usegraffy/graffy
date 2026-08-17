import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  mergeProjections,
  selectByArgs,
  selectByIds,
} from '../../sql/select.ts';

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
        name: 'String',
        participants: 'Nullable(String)',
        nativeData: 'JSON',
      },
    },
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

    assert.strictEqual(
      normalize(sql),
      normalize(`
        SELECT * FROM \`default\`.\`user\`
        WHERE \`isDeleted\` = 0
        ORDER BY \`id\` ASC
        LIMIT 10
      `),
    );
  });

  test('selectByIds', () => {
    const { sql } = selectByIds(['a', 'b'], null, options);
    assert.strictEqual(
      normalize(sql),
      normalize(`
        SELECT * FROM \`default\`.\`user\`
        WHERE \`id\` IN ('a', 'b')
      `),
    );
  });

  test('selectByIds_with_explicit_final', () => {
    const { sql } = selectByIds(['a'], null, {
      ...options,
      final: true,
    });
    assert.strictEqual(
      normalize(sql),
      normalize(`
        SELECT * FROM \`default\`.\`user\` FINAL
        WHERE \`id\` IN ('a')
      `),
    );
  });

  test('selectByArgs_pushes_projection_and_cursor_columns', () => {
    const { sql } = selectByArgs(
      {
        $order: ['isDeleted'],
        $first: 10,
      },
      {
        name: true,
        participants: { address: true },
      },
      options,
    );

    assert.ok(
      normalize(sql).includes(
        normalize(`
          SELECT \`name\`, CAST(concat(
            '{', '"address":',
            ifNull(nullIf(JSONExtractRaw(
              ifNull(\`participants\`, '{}'), 'address'
            ), ''), 'null'), '}'
          ), 'JSON') AS \`participants\`,
          \`id\`, \`updatedAt\`, \`isDeleted\`
        `),
      ),
    );
    assert.ok(normalize(sql).includes('ORDER BY `isDeleted` ASC LIMIT 10'));
  });

  test('selectByIds_pushes_projection_and_metadata_columns', () => {
    const { sql } = selectByIds(
      ['a', 'b'],
      {
        participants: { address: true },
      },
      options,
    );

    assert.ok(
      normalize(sql).includes(
        normalize(`
          CAST(concat(
            '{', '"address":',
            ifNull(nullIf(JSONExtractRaw(
              ifNull(\`participants\`, '{}'), 'address'
            ), ''), 'null'), '}'
          ), 'JSON') AS \`participants\`
        `),
      ),
    );
    assert.ok(
      normalize(sql).includes(
        normalize(`
          \`id\`, \`updatedAt\`
          FROM \`default\`.\`user\`
          WHERE \`id\` IN ('a', 'b')
        `),
      ),
    );
  });

  test('native_json_projection_reads_only_requested_subcolumn', () => {
    const { sql } = selectByArgs(
      { $order: ['id'], $all: true },
      {
        nativeData: {
          foo: { bar: { baz: true } },
        },
      },
      options,
    );

    assert.ok(
      normalize(sql).includes(
        normalize(`
          ifNull(
            toJSONString(\`nativeData\`.\`foo\`.\`bar\`.\`baz\`),
            'null'
          )
        `),
      ),
    );
    assert.ok(sql.includes("'JSON') AS `nativeData`"));
    assert.ok(!normalize(sql).includes('SELECT `nativeData`'));
  });

  test('nested_order_path_is_added_to_partial_json_projection', () => {
    const { sql } = selectByArgs(
      { $order: ['participants.cursor.rank'], $first: 10 },
      { participants: { address: true } },
      options,
    );

    assert.ok(
      normalize(sql).includes(
        normalize(`
          JSONExtractRaw(
            ifNull(\`participants\`, '{}'), 'cursor', 'rank'
          )
        `),
      ),
    );
    assert.ok(
      normalize(sql).includes(
        normalize(`
          ORDER BY JSONExtractString(
            ifNull(\`participants\`, '{}'), 'cursor', 'rank'
          ) ASC
        `),
      ),
    );
  });

  test('projection_unknown_column_throws', () => {
    assert.throws(
      () => selectByArgs({ $all: true }, { missing: true }, options),
      /clickhouse.no_column missing/,
    );
  });

  test('mergeProjections_combines_nested_id_read_shapes', () => {
    assert.deepStrictEqual(
      mergeProjections(
        { data: { foo: true } },
        { data: { bar: { baz: true } }, name: true },
      ),
      {
        data: {
          foo: true,
          bar: { baz: true },
        },
        name: true,
      },
    );
    assert.deepStrictEqual(
      mergeProjections({ data: { foo: true } }, { data: true }),
      { data: true },
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

    assert.strictEqual(selection.isAggregate, true);
    assert.strictEqual(selection.groupSpec, true);
    assert.ok(
      normalize(selection.sql).includes(
        normalize(`
          SELECT count() AS \`$count\`, sum(
            toFloat64OrZero(
              JSONExtractString(ifNull(\`participants\`, '{}'), '0', 'count')
            )
          ) AS \`__agg_0\`
        `),
      ),
    );
    assert.ok(
      normalize(selection.sql).includes(
        normalize(`
          FROM \`default\`.\`user\`
          WHERE \`isDeleted\` = 0
          LIMIT 1
        `),
      ),
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

    assert.strictEqual(selection.isAggregate, true);
    assert.deepStrictEqual(selection.groupSpec, ['isDeleted']);
    assert.deepStrictEqual(selection.aggregateAliases, {
      __agg_0: { op: '$avg', prop: 'updatedAt' },
      __agg_1: { op: '$max', prop: 'updatedAt' },
      __agg_2: { op: '$min', prop: 'updatedAt' },
      __agg_3: { op: '$card', prop: 'id' },
    });
    assert.ok(
      normalize(selection.sql).includes(
        normalize(`
          SELECT
          \`isDeleted\` AS \`__group_0\`,
          count() AS \`$count\`,
          avg(toFloat64OrZero(\`updatedAt\`)) AS \`__agg_0\`,
          max(toFloat64OrZero(\`updatedAt\`)) AS \`__agg_1\`,
          min(toFloat64OrZero(\`updatedAt\`)) AS \`__agg_2\`,
          uniqExact(\`id\`) AS \`__agg_3\`
        `),
      ),
    );
    assert.ok(normalize(selection.sql).includes('GROUP BY `isDeleted`'));
    assert.ok(normalize(selection.sql).includes('LIMIT 4096'));
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

    assert.strictEqual(selection.isAggregate, true);
    assert.strictEqual(selection.groupSpec, true);
    assert.deepStrictEqual(selection.aggregateAliases, {
      __agg_0: { op: '$sum', prop: 'updatedAt' },
      __agg_1: { op: '$sum', prop: 'participants.0.count' },
      __agg_2: { op: '$avg', prop: 'updatedAt' },
      __agg_3: { op: '$max', prop: 'updatedAt' },
      __agg_4: { op: '$min', prop: 'updatedAt' },
      __agg_5: { op: '$card', prop: 'id' },
    });
    assert.ok(
      normalize(selection.sql).includes(normalize('count() AS `$count`')),
    );
    assert.ok(
      normalize(selection.sql).includes(
        normalize('sum(toFloat64OrZero(`updatedAt`)) AS `__agg_0`'),
      ),
    );
    assert.ok(
      normalize(selection.sql).includes(
        normalize(
          "sum(toFloat64OrZero(JSONExtractString(ifNull(`participants`,'{}'),'0','count'))) AS `__agg_1`",
        ),
      ),
    );
    assert.ok(
      normalize(selection.sql).includes(
        normalize('avg(toFloat64OrZero(`updatedAt`)) AS `__agg_2`'),
      ),
    );
    assert.ok(
      normalize(selection.sql).includes(
        normalize('max(toFloat64OrZero(`updatedAt`)) AS `__agg_3`'),
      ),
    );
    assert.ok(
      normalize(selection.sql).includes(
        normalize('min(toFloat64OrZero(`updatedAt`)) AS `__agg_4`'),
      ),
    );
    assert.ok(
      normalize(selection.sql).includes(
        normalize('uniqExact(`id`) AS `__agg_5`'),
      ),
    );
  });
});
