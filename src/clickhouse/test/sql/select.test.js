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
        _sign: 'Int8',
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
      options,
    );

    expect(normalize(sql)).toEqual(
      normalize(`
        SELECT * FROM \`default\`.\`user\` FINAL
        WHERE \`_sign\` = 1 AND \`isDeleted\` = 0
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
        WHERE \`_sign\` = 1 AND \`id\` IN ('a', 'b')
      `),
    );
  });
});
