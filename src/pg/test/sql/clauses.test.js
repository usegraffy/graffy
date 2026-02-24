import sql from 'sql-template-tag';
import {
  getInsert,
  getJsonBuildTrusted,
  getSelectCols,
  getUpdates,
  lookup,
} from '../../sql/clauses';
import expectSql from '../expectSql';

describe('clauses', () => {
  test('insert', () => {
    const data = [
      { a: 1, b: 1 },
      { a: 2, b: 2 },
    ];

    const { cols, vals, updates } = getInsert(data, {
      verCol: 'version',
      schema: { types: { a: 'int8', b: 'float', version: 'int8' } },
      verDefault: 'current_timestamp',
    });
    expectSql(cols, sql`"a", "b", "version"`);
    expectSql(
      vals,
      sql`(${data[0].a} , ${data[0].b} , default), (${data[1].a} , ${data[1].b} , default)`,
    );
    expectSql(
      updates,
      sql`"a" = "excluded"."a", "b" = "excluded"."b", "version" = "excluded"."version"`,
    );
  });

  test('updates', () => {
    const data = { a: 1, b: 1 };

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

  test('lookup_known_column', () => {
    const options = { schema: { types: { name: 'text' } } };
    expectSql(lookup('name', options), sql`"name"`);
  });

  test('lookup_unknown_column_throws', () => {
    const options = { schema: { types: { name: 'text' } } };
    expect(() => lookup('unknown', options)).toThrow('pg.no_column unknown');
  });

  test('lookup_jsonb_path', () => {
    const options = { schema: { types: { data: 'jsonb' } } };
    expectSql(lookup('data.field', options), sql`"data" #> ${['field']}`);
  });

  test('lookup_cube_index', () => {
    const options = { schema: { types: { coords: 'cube' } } };
    expectSql(lookup('coords.0', options), sql`"coords" ~> ${0}`);
  });

  test('lookup_cannot_lookup_throws', () => {
    const options = { schema: { types: { name: 'text' } } };
    expect(() => lookup('name.sub', options)).toThrow('pg.cannot_lookup name.sub');
  });

  test('OptimisedJsonBuild', () => {
    const data = {
      name: 1,
      email: 2,
      profile: {
        id: 3,
        name: 4,
      },
    };
    const query = getJsonBuildTrusted(data);
    expectSql(
      query,
      sql`jsonb_build_object('name', ${'1'}::jsonb, 'email', ${'2'}::jsonb, 'profile', ${'{"id":3,"name":4}'}::jsonb)`,
    );
  });
});
