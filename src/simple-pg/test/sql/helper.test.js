import sql from 'sql-template-tag';
import expectSql from '../../../pg/sql/expectSql';
import { colsAndValues, getUpdates, nowTimestamp } from '../../sql/helper';

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
});
