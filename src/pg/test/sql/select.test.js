import { selectByArgs, selectByIds } from '../../sql/select.js';

import sql, { raw } from 'sql-template-tag';
import expectSql from '../expectSql.js';

describe('select_sql', () => {
  const tenantId = 'tenant-id';
  const $group = ['isDeleted'];

  test('selectByArgs_first', () => {
    const arg = { $order: ['name', 'id'], $first: 10 };
    const options = {
      table: 'user',
      prefix: ['user'],
      idCol: 'id',
      verCol: 'version',
      schema: { types: {} },
      verDefault: 'current_timestamp',
    };
    const expectedResult = sql`
      SELECT to_jsonb("${raw(options.table)}") || jsonb_build_object('$key',
        ( jsonb_build_object('$order', ${'["name","id"]'}::jsonb) ||
          jsonb_build_object ('$cursor', jsonb_build_array("name","id"))),
        '$ref', jsonb_build_array(${
          options.table
        }::text, "id"), '$ver', current_timestamp
      )
      FROM "user" ORDER BY "name" ASC, "id" ASC LIMIT ${10}
    `;

    expectSql(selectByArgs(arg, null, options), expectedResult);
  });

  test('selectByArgs_count', () => {
    const arg = { $group: true };
    const options = {
      table: 'prospect',
      prefix: ['prospect'],
      idCol: 'id',
      verCol: 'version',
      verDefault: 'current_timestamp',
    };
    const expectedResult = sql`
      SELECT
          jsonb_build_object('$count', count(*)) || jsonb_build_object('$key', ${`null`}::jsonb, '$ver', current_timestamp)
      FROM
          "prospect"
      LIMIT ${1}
    `;

    expectSql(selectByArgs(arg, { $count: true }, options), expectedResult);
  });

  test('selectByArgs_count_filter', () => {
    const arg = { $group: true, tenantId };
    const options = {
      table: 'prospect',
      prefix: ['prospect'],
      idCol: 'id',
      verCol: 'version',
      schema: { types: { tenantId: true } },
      verDefault: 'current_timestamp',
    };
    const expectedResult = sql`
      SELECT
          jsonb_build_object('$count', count(*)) || jsonb_build_object('$key', ${JSON.stringify(
            { tenantId },
          )}::jsonb, '$ver', current_timestamp)
      FROM
          "prospect"
      WHERE
          "tenantId" = ${tenantId}
      LIMIT ${1}
    `;

    expectSql(selectByArgs(arg, { $count: true }, options), expectedResult);
  });

  test('selectByArgs_count_group_by', () => {
    const arg = { $group, $all: true, tenantId };
    const options = {
      table: 'prospect',
      prefix: ['prospect'],
      idCol: 'id',
      verCol: 'version',
      schema: { types: { tenantId: true } },
      verDefault: 'current_timestamp',
    };
    const expectedResult = sql`
      SELECT
          jsonb_build_object('$count', count(*)) || jsonb_build_object('$key', (${JSON.stringify(
            { tenantId },
          )}::jsonb || jsonb_build_object('$group', ${JSON.stringify(
      $group,
    )}::jsonb) || jsonb_build_object('$cursor', jsonb_build_array("isDeleted"))), '$ver', current_timestamp)
      FROM
          "prospect"
      WHERE
          "tenantId" = ${tenantId}
      GROUP BY
          "isDeleted"
      LIMIT ${4096}
    `;

    expectSql(selectByArgs(arg, { $count: true }, options), expectedResult);
  });

  test('selectByArgs_sum', () => {
    const arg = { $group, $all: true, tenantId };
    const options = {
      table: 'prospect',
      prefix: ['prospect'],
      idCol: 'id',
      verCol: 'version',
      schema: { types: { tenantId: true } },
      verDefault: 'current_timestamp',
    };
    const expectedResult = sql`
      SELECT
          jsonb_build_object(${`$sum`}::text, jsonb_build_object(${`data.Amount`}::text, sum(("data" #> ${[
      'Amount',
    ]})::numeric))) || jsonb_build_object('$key', (${JSON.stringify({
      tenantId,
    })}::jsonb || jsonb_build_object('$group', ${JSON.stringify(
      $group,
    )}::jsonb) || jsonb_build_object('$cursor', jsonb_build_array("isDeleted"))), '$ver', current_timestamp)
      FROM
          "prospect"
      WHERE
          "tenantId" = ${tenantId}
      GROUP BY
          "isDeleted"
      LIMIT ${4096}
    `;

    expectSql(
      selectByArgs(arg, { $sum: { 'data.Amount': true } }, options),
      expectedResult,
    );
  });

  test('selectByArgs_avg', () => {
    const arg = { $group, $all: true, tenantId };
    const options = {
      table: 'prospect',
      prefix: ['prospect'],
      idCol: 'id',
      verCol: 'version',
      schema: { types: { tenantId: true } },
      verDefault: 'current_timestamp',
    };
    const expectedResult = sql`
      SELECT
          jsonb_build_object(${`$avg`}::text, jsonb_build_object(${`data.Amount`}::text, avg(("data" #> ${[
      'Amount',
    ]})::numeric))) || jsonb_build_object('$key', (${JSON.stringify({
      tenantId,
    })}::jsonb || jsonb_build_object('$group', ${JSON.stringify(
      $group,
    )}::jsonb) || jsonb_build_object('$cursor', jsonb_build_array("isDeleted"))), '$ver', current_timestamp)
      FROM
          "prospect"
      WHERE
          "tenantId" = ${tenantId}
      GROUP BY
          "isDeleted"
      LIMIT ${4096}
    `;

    expectSql(
      selectByArgs(arg, { $avg: { 'data.Amount': true } }, options),
      expectedResult,
    );
  });

  test('selectByArgs_max', () => {
    const arg = { $group, $all: true, tenantId };
    const options = {
      table: 'prospect',
      prefix: ['prospect'],
      idCol: 'id',
      verCol: 'version',
      schema: { types: { tenantId: true } },
      verDefault: 'current_timestamp',
    };
    const expectedResult = sql`
      SELECT
          jsonb_build_object(${`$max`}::text, jsonb_build_object(${`data.Amount`}::text, max(("data" #> ${[
      'Amount',
    ]})::numeric))) || jsonb_build_object('$key', (${JSON.stringify({
      tenantId,
    })}::jsonb || jsonb_build_object('$group', ${JSON.stringify(
      $group,
    )}::jsonb) || jsonb_build_object('$cursor', jsonb_build_array("isDeleted"))), '$ver', current_timestamp)
      FROM
          "prospect"
      WHERE
          "tenantId" = ${tenantId}
      GROUP BY
          "isDeleted"
      LIMIT ${4096}
    `;

    expectSql(
      selectByArgs(arg, { $max: { 'data.Amount': true } }, options),
      expectedResult,
    );
  });

  test('selectByArgs_min', () => {
    const arg = { $group, $all: true, tenantId };
    const options = {
      table: 'prospect',
      prefix: ['prospect'],
      idCol: 'id',
      verCol: 'version',
      schema: { types: { tenantId: true } },
      verDefault: 'current_timestamp',
    };
    const expectedResult = sql`
      SELECT
          jsonb_build_object(${`$min`}::text, jsonb_build_object(${`data.Amount`}::text, min(("data" #> ${[
      'Amount',
    ]})::numeric))) || jsonb_build_object('$key', (${JSON.stringify({
      tenantId,
    })}::jsonb || jsonb_build_object('$group', ${JSON.stringify(
      $group,
    )}::jsonb) || jsonb_build_object('$cursor', jsonb_build_array("isDeleted"))), '$ver', current_timestamp)
      FROM
          "prospect"
      WHERE
          "tenantId" = ${tenantId}
      GROUP BY
          "isDeleted"
      LIMIT ${4096}
    `;

    expectSql(
      selectByArgs(arg, { $min: { 'data.Amount': true } }, options),
      expectedResult,
    );
  });

  test('selectById', () => {
    const ids = ['1', '2'];
    const options = {
      table: 'user',
      prefix: ['user'],
      idCol: 'id',
      verCol: 'version',
      verDefault: 'current_timestamp',
    };

    const expectedResult = sql`
      SELECT to_jsonb("${raw(options.table)}") || jsonb_build_object(
        '$key', "${raw(options.idCol)}", '$ver', current_timestamp
      )
      FROM "user" WHERE "id" IN (${ids[0]}, ${ids[1]})
    `;
    expectSql(selectByIds(ids, null, options), expectedResult);
  });

  test('selectByArgs_order_first', () => {
    const arg = { $order: ['createTime', 'id'], $first: 10 };
    const options = {
      table: 'user',
      prefix: ['user'],
      idCol: 'id',
      verCol: 'version',
      verDefault: 'current_timestamp',
    };
    const expectedResult = sql`
      SELECT to_jsonb("${raw(options.table)}") || jsonb_build_object('$key',
        ( jsonb_build_object('$order', ${'["createTime","id"]'}::jsonb) ||
          jsonb_build_object ('$cursor', jsonb_build_array("createTime","id"))),
        '$ref', jsonb_build_array(${
          options.table
        }::text, "id"), '$ver', current_timestamp
      )
      FROM "user" ORDER BY "createTime" ASC, "id" ASC LIMIT ${10}
    `;

    expectSql(selectByArgs(arg, null, options), expectedResult);
  });

  test('selectByArgs_order_before', () => {
    const arg = { $order: ['createTime', 'id'], $before: [2, 3] };
    const options = {
      table: 'user',
      prefix: ['user'],
      idCol: 'id',
      verCol: 'version',
      verDefault: 'current_timestamp',
    };
    const expectedResult = sql`
    SELECT to_jsonb("${raw(options.table)}") || jsonb_build_object('$key',
    ( jsonb_build_object('$order', ${'["createTime","id"]'}::jsonb) ||
      jsonb_build_object ('$cursor', jsonb_build_array("createTime","id"))),
    '$ref', jsonb_build_array(${
      options.table
    }::text, "id"), '$ver', current_timestamp
  )
  FROM "user"
  WHERE \"createTime\" < ${2} OR \"createTime\" = ${2} AND ( \"id\" < ${3} )
  ORDER BY "createTime" ASC, "id" ASC LIMIT ${4096}
`;

    expectSql(selectByArgs(arg, null, options), expectedResult);
  });

  test('selectByArgs_implicit_order', () => {
    const arg = { $first: 10 };
    const options = {
      table: 'user',
      prefix: ['user'],
      idCol: 'id',
      verCol: 'version',
      verDefault: 'current_timestamp',
    };
    const expectedResult = sql`
      SELECT to_jsonb("${raw(options.table)}") || jsonb_build_object('$key',
        (jsonb_build_object ('$cursor', jsonb_build_array("id"))),
        '$ref', jsonb_build_array(${
          options.table
        }::text, "id"), '$ver', current_timestamp
      )
      FROM "user" ORDER BY "id" ASC LIMIT ${10}
    `;

    expectSql(selectByArgs(arg, null, options), expectedResult);
  });

  // test('selectByArgs_json manipulation', () => {});
});
