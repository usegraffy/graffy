import sql, { raw } from 'sql-template-tag';
import expectSql from '../expectSql';
import {
  getInsert,
  getUpdates,
  nowTimestamp,
  getJsonBuildObject,
  getSelectCols,
} from '../../sql/clauses';

describe('tests sql helper', () => {
  const data = { a: 1, b: 1 };

  test('should correctly return sql for cols and values', () => {
    const { cols, vals } = getInsert(data, { verCol: 'version' });
    expectSql(cols, sql`"a", "b", "version"`);
    expectSql(vals, sql`${data.a} , ${data.b} , ${nowTimestamp}`);
  });

  test('should correctly return sql for updating', () => {
    const options = { id: 'id', verCol: 'version' };
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
