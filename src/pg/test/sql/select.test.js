import { selectByArgs, selectByIds } from '../../sql/select.js';

import sql, { raw } from 'sql-template-tag';
import expectSql from '../expectSql.js';

describe('select_sql', () => {
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

  test('selectByArgs_group_count_sum', () => {
    const arg = { $first: 1, $group: ['isDeleted'], isDeleted: false };
    const options = {
      table: 'prospect',
      prefix: ['prospect'],
      idCol: 'id',
      verCol: 'version',
      verDefault: 'current_timestamp',
      schema: { types: { isDeleted: 1 } },
    };
    const expectedResult = sql`
      SELECT
      jsonb_build_object (
          '$count',
          count (*),
          ${`$sum`}::text,
          jsonb_build_object (
              ${`data.Amount`}::text,
              sum (
                  (
                      CASE
                          WHEN 
                              "data" #> ${[
                                'Amount',
                              ]} = 'null'::jsonb THEN 0 ELSE ("data" #> ${[
      'Amount',
    ]})::numeric END )::numeric ) ) ) || jsonb_build_object ( '$key' , ( ${`{"isDeleted":false}`}::jsonb || jsonb_build_object ( '$cursor' , jsonb_build_array ( "isDeleted" ) ) ) || jsonb_build_object ( '$group' , ${`["isDeleted"]`}::jsonb ) , '$ver' , current_timestamp ) FROM "prospect" WHERE "isDeleted" = ${false} GROUP BY "isDeleted" LIMIT ${1}
    `;

    expectSql(
      selectByArgs(
        arg,
        { $count: true, $sum: { 'data.Amount': true } },
        options,
      ),
      expectedResult,
    );
  });

  test('selectByArgs_group_count_avg', () => {
    const arg = { $all: true, $group: ['isDeleted'], isDeleted: false };
    const options = {
      table: 'prospect',
      prefix: ['prospect'],
      idCol: 'id',
      verCol: 'version',
      verDefault: 'current_timestamp',
      schema: { types: { isDeleted: 1 } },
    };
    const expectedResult = sql`
      SELECT
      jsonb_build_object (
          '$count',
          count (*),
          ${`$avg`}::text,
          jsonb_build_object (
              ${`data.Amount`}::text,
              avg (
                  (
                      CASE
                          WHEN 
                              "data" #> ${[
                                'Amount',
                              ]} = 'null'::jsonb THEN 0 ELSE ("data" #> ${[
      'Amount',
    ]})::numeric END )::numeric ) ) ) || jsonb_build_object ( '$key' , ( ${`{"isDeleted":false}`}::jsonb || jsonb_build_object ( '$cursor' , jsonb_build_array ( "isDeleted" ) ) ) || jsonb_build_object ( '$group' , ${`["isDeleted"]`}::jsonb ) , '$ver' , current_timestamp ) FROM "prospect" WHERE "isDeleted" = ${false} GROUP BY "isDeleted" LIMIT ${4096}
    `;

    expectSql(
      selectByArgs(
        arg,
        { $count: true, $avg: { 'data.Amount': true } },
        options,
      ),
      expectedResult,
    );
  });

  test('selectByArgs_group_count_max', () => {
    const arg = { $all: true, $group: ['isDeleted'], isDeleted: false };
    const options = {
      table: 'prospect',
      prefix: ['prospect'],
      idCol: 'id',
      verCol: 'version',
      verDefault: 'current_timestamp',
      schema: { types: { isDeleted: 1 } },
    };
    const expectedResult = sql`
      SELECT
      jsonb_build_object (
          '$count',
          count (*),
          ${`$max`}::text,
          jsonb_build_object (
              ${`data.Amount`}::text,
              max (
                  (
                      CASE
                          WHEN 
                              "data" #> ${[
                                'Amount',
                              ]} = 'null'::jsonb THEN 0 ELSE ("data" #> ${[
      'Amount',
    ]})::numeric END )::numeric ) ) ) || jsonb_build_object ( '$key' , ( ${`{"isDeleted":false}`}::jsonb || jsonb_build_object ( '$cursor' , jsonb_build_array ( "isDeleted" ) ) ) || jsonb_build_object ( '$group' , ${`["isDeleted"]`}::jsonb ) , '$ver' , current_timestamp ) FROM "prospect" WHERE "isDeleted" = ${false} GROUP BY "isDeleted" LIMIT ${4096}
    `;

    expectSql(
      selectByArgs(
        arg,
        { $count: true, $max: { 'data.Amount': true } },
        options,
      ),
      expectedResult,
    );
  });

  test('selectByArgs_group_count_min', () => {
    const arg = { $all: true, $group: ['isDeleted'], isDeleted: false };
    const options = {
      table: 'prospect',
      prefix: ['prospect'],
      idCol: 'id',
      verCol: 'version',
      verDefault: 'current_timestamp',
      schema: { types: { isDeleted: 1 } },
    };
    const expectedResult = sql`
      SELECT
      jsonb_build_object (
          '$count',
          count (*),
          ${`$min`}::text,
          jsonb_build_object (
              ${`data.Amount`}::text,
              min (
                  (
                      CASE
                          WHEN 
                              "data" #> ${[
                                'Amount',
                              ]} = 'null'::jsonb THEN 0 ELSE ("data" #> ${[
      'Amount',
    ]})::numeric END )::numeric ) ) ) || jsonb_build_object ( '$key' , ( ${`{"isDeleted":false}`}::jsonb || jsonb_build_object ( '$cursor' , jsonb_build_array ( "isDeleted" ) ) ) || jsonb_build_object ( '$group' , ${`["isDeleted"]`}::jsonb ) , '$ver' , current_timestamp ) FROM "prospect" WHERE "isDeleted" = ${false} GROUP BY "isDeleted" LIMIT ${4096}
    `;

    expectSql(
      selectByArgs(
        arg,
        { $count: true, $min: { 'data.Amount': true } },
        options,
      ),
      expectedResult,
    );
  });

  // test('selectByArgs_json manipulation', () => {});
});
