import { selectByArgs, selectByIds } from '../../sql/select.js';

import sql, { raw } from 'sql-template-tag';
import expectSql from '../expectSql.js';
import { nowTimestamp } from '../../sql/helper.js';

describe('tests select sql', () => {
  test('should return correctly sql query for selectByArgs', () => {
    const arg = { $first: 10 };
    const options = {
      table: 'user',
      prefix: ['user'],
      idCol: 'id',
      verCol: 'version',
    };
    const expectedResult = sql`
      SELECT to_jsonb("${raw(options.table)}") || jsonb_build_object(
        '$key', (jsonb_build_object ('$cursor', jsonb_build_array("id"))),
        '$ref', array[${options.table}, "id"], '$ver', ${nowTimestamp}
      )
      FROM "user" ORDER BY "id" ASC LIMIT ${10}
    `;

    expectSql(selectByArgs(arg, options), expectedResult);
  });

  test('should return correctly sql query for selectById', () => {
    const ids = ['1', '2'];
    const options = {
      table: 'user',
      prefix: ['user'],
      idCol: 'id',
      verCol: 'version',
    };

    const expectedResult = sql`
      SELECT to_jsonb("${raw(options.table)}") || jsonb_build_object(
        '$key', "${raw(options.idCol)}", '$ver', ${nowTimestamp}
      )
      FROM "user" WHERE "id" IN (${ids[0]}, ${ids[1]})
    `;
    expectSql(selectByIds(ids, options), expectedResult);
  });

  test('should return correctly sql query for selectByArgs having RangeArg', () => {
    const arg = { $order: ['createTime', 'id'], $first: 10 };
    const options = {
      table: 'user',
      prefix: ['user'],
      idCol: 'id',
      verCol: 'version',
    };
    const expectedResult = sql`
      SELECT to_jsonb("${raw(options.table)}") || jsonb_build_object(
        '$key', (jsonb_build_object ('$order', jsonb_build_array ( "createTime" , "id" ))
        || jsonb_build_object ( '$cursor' , jsonb_build_array ( "createTime" , "id" ) )),
        '$ref', array[${options.table}, "id"], '$ver', ${nowTimestamp}
      )
      FROM "user" ORDER BY "createTime" ASC, "id" ASC LIMIT ${10}
    `;

    expectSql(selectByArgs(arg, options), expectedResult);
  });

  test('should return correctly sql query for selectByArgs having before', () => {
    const arg = { $order: ['createTime', 'id'], $before: [2, 3] };
    const options = {
      table: 'user',
      prefix: ['user'],
      idCol: 'id',
      verCol: 'version',
    };
    const expectedResult = sql`
      SELECT to_jsonb("${raw(options.table)}") || jsonb_build_object(
        '$key', (jsonb_build_object ('$order', jsonb_build_array ( "createTime" , "id" ))
        || jsonb_build_object ( '$cursor' , jsonb_build_array ( "createTime" , "id" ) )),
        '$ref', array[${options.table}, "id"], '$ver', ${nowTimestamp}
      )
      FROM "user"  WHERE "createTime" < ${2} OR "createTime" = ${2} AND ( "id" < ${3} )ORDER BY "createTime" ASC, "id" ASC LIMIT ${4096}
    `;

    expectSql(selectByArgs(arg, options), expectedResult);
  });

  test('should return correctly sql query for selectByArgs having json manipulation', () => {});
});
