import sql from 'sql-template-tag';
import expectSql from '../expectSql';
import {
  getInsert,
  getUpdates,
  getJsonBuildTrusted,
  getSelectCols,
} from '../../sql/clauses';

describe('clauses', () => {
  const data = { a: 1, b: 1 };

  test('insert', () => {
    const { cols, vals } = getInsert(data, {
      verCol: 'version',
      schema: { types: { a: 'int8', b: 'float', version: 'int8' } },
      verDefault: 'current_timestamp',
    });
    expectSql(cols, sql`"a", "b", "version"`);
    expectSql(vals, sql`${data.a} , ${data.b} , default`);
  });

  test('updates', () => {
    const options = {
      idCol: 'id',
      verCol: 'version',
      schema: { types: { a: 'int8', b: 'float', version: 'int8' } },
      verDefault: 'current_timestamp',
    };
    const update = getUpdates(data, options);
    expectSql(
      update,
      sql`"a" = ${data.a}, "b" = ${data.b}, "version" =  default`,
    );
  });

  test('jsonBuildObject', () => {
    const data = { a: 1, b: 2, version: sql`default` };
    const query = getJsonBuildTrusted(data);
    expectSql(
      query,
      sql`jsonb_build_object('a', ${'1'}::jsonb, 'b', ${'2'}::jsonb, 'version', default)`,
    );
  });

  test('selectCols', () => {
    const options = {
      idCol: 'id',
      table: test,
      verCol: 'version',
      schema: { types: { a: 'int8', b: 'float', version: 'int8' } },
      verDefault: 'current_timestamp',
    };
    const query = getSelectCols(options);
    expectSql(query, sql`*`);
  });
});
