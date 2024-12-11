import sql from 'sql-template-tag';
import {
  getInsert,
  getJsonBuildTrusted,
  getSelectCols,
  getUpdates,
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

  describe("JSONB partial projection SQL", () => {
    const options = {
      verCol: "version",
      schema: {
        types: {
          id: "uuid",
          data: "jsonb",
          version: "int8",
        },
      },
      verDefault: "default",
    };

    test("getUpdates with partial json object", () => {
      const row = {
        data: { foo: { bar: 33, baz: null }, qux: true },
        version: 10,
        $put: true, // Indicates a full put operation
      };

      const res = getUpdates(row, options);

      // Check that it includes jsonb_build_object and filters null.
      expect(res.text).toMatch(/jsonb_build_object/);
      expect(res.text).toMatch(/jsonb_each/);
      expect(res.text).not.toMatch(/"baz"/); // should be filtered out
      expect(res.text).toMatch(/"bar"/); // 'bar' should still be present
      expect(res.text).toMatch(/"qux"/);

      // Just ensure it compiles as SQL without syntax errors.
      expect(res.text).toContain('"data" = ');
      expect(res.text).toContain('"version" =  default');
    });

    test("getUpdates with empty object and put", () => {
      const row = {
        data: {},
        version: 5,
        $put: true,
      };
      const res = getUpdates(row, options);
      // If $put and no fields, we return jsonb '{}' rather than null
      // as we are doing a PUT operation.
      expect(res.text).toMatch(/jsonb_build_object\(\)/);
    });

    test("getInsert with multiple rows", () => {
      const rows = [
        {
          id: "abcd-1234",
          data: {
            alpha: 1,
            nested: { foo: "bar", removeMe: null },
            arr: [1, 2],
          },
          $put: true,
        },
        {
          id: "abcd-5678",
          data: { onlyNulls: { a: null, b: null } },
          $put: true,
        },
      ];

      const { cols, vals, updates } = getInsert(rows, options);
      expect(cols.text).toContain('"id", "data", "version"');
      expect(vals.text).toContain("jsonb_build_object");
      expect(vals.text).not.toContain("removeMe"); // null filtered
      expect(vals.text).toContain("arr");
      expect(vals.text).toContain('"onlyNulls"'); // becomes empty object?
      expect(updates.text).toContain('"data" = "excluded"."data"');
    });

    test("no json partial needed", () => {
      const row = {
        data: { foo: true },
        version: 3,
      };
      const res = getUpdates(row, options);
      expect(res.text).toContain("jsonb_build_object('foo',"); // no null filtering needed
    });
  });
});
