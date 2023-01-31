import { selectByArgs, selectByIds } from '../../sql/select.js';

import sql from 'sql-template-tag';
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
      SELECT *, (
          ${JSON.stringify({ $order: ['name', 'id'] })}::jsonb ||
          jsonb_build_object ('$cursor', jsonb_build_array("name","id"))
        ) AS "$key",
        current_timestamp AS "$ver",
        array[ ${options.table}::text, "id" ]::text[] AS "$ref"
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
      SELECT *, "id" AS "$key", current_timestamp AS "$ver"
      FROM "user" WHERE "id" IN (${ids[0]}, ${ids[1]})
    `;
    expectSql(selectByIds(ids, null, options), expectedResult);
  });

  test('selectByArgs_no_range', () => {
    const arg = { email: 'abc@foo.com' };
    const options = {
      table: 'user',
      prefix: ['user'],
      idCol: 'id',
      schema: { types: { email: 'text' } },
      verCol: 'version',
      verDefault: 'current_timestamp',
    };

    const expectedResult = sql`
      SELECT *, ${JSON.stringify({ email: 'abc@foo.com' })}::jsonb AS "$key",
      current_timestamp AS "$ver",
      array[ ${'user'}::text, "id" ]::text[] AS "$ref"
      FROM "user" WHERE "email" = ${'abc@foo.com'} LIMIT ${1}
    `;
    expectSql(selectByArgs(arg, null, options), expectedResult);
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
      SELECT *, (
          ${JSON.stringify({ $order: ['createTime', 'id'] })}::jsonb ||
          jsonb_build_object ('$cursor', jsonb_build_array("createTime","id"))
        ) AS "$key",
        current_timestamp AS "$ver",
        array[ ${options.table}::text, "id" ]::text[] AS "$ref"
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
      SELECT *, (
          ${JSON.stringify({ $order: ['createTime', 'id'] })}::jsonb ||
          jsonb_build_object ('$cursor', jsonb_build_array("createTime","id"))
        ) AS "$key",
        current_timestamp AS "$ver",
        array[ ${options.table}::text, "id" ]::text[] AS "$ref"
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
      SELECT *, (
          ${'{}'}::jsonb ||
          jsonb_build_object ('$cursor', jsonb_build_array("id"))
        ) AS "$key",
        current_timestamp AS "$ver",
        array[ ${options.table}::text, "id" ]::text[] AS "$ref"
      FROM "user" ORDER BY "id" ASC LIMIT ${10}
    `;

    expectSql(selectByArgs(arg, null, options), expectedResult);
  });

  // test('selectByArgs_json manipulation', () => {});
});
