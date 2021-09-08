import sql, { raw } from 'sql-template-tag';
import expectSql from '../expectSql';
import {
  colsAndValues,
  getUpdates,
  nowTimestamp,
  getJsonBuildObject,
  getSelectCols,
} from '../../sql/helper';

describe('tests sql helper', () => {
  const data = { a: 1, b: 1 };

  test('should correctly return sql for cols and values', () => {
    const { cols, values } = colsAndValues(data, 'version');
    expectSql(cols, sql`"a", "b", "version"`);
    expectSql(values, sql`${data.a} , ${data.b} , ${nowTimestamp}`);
  });

  test('should correctly return sql for updating', () => {
    const options = { id: 'id', version: 'version' };
    const update = getUpdates(data, options);
    expectSql(
      update,
      sql`"a" = ${data.a}, "b" = ${data.b}, "version" =  ${nowTimestamp}`,
    );
  });

  test('should correctly return sql for json-build-object', () => {
    const data = { a: 1, b: 2, version: nowTimestamp };
    const query = getJsonBuildObject(data);
    expectSql(
      query,
      sql`jsonb_build_object('a', ${data.a}, 'b', ${data.b}, 'version', ${nowTimestamp})`,
    );
  });

  test('should correctly return select columns', () => {
    const table = 'test';
    const query = getSelectCols(table);
    expectSql(query, sql`to_jsonb("${raw(table)}")`);
  });
});
