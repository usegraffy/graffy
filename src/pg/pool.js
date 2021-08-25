import { Pool } from 'pg';
import sql from 'sql-template-tag';

import debug from 'debug';
const errorlog = debug('graffy:pg:error');

export const pgPool = new Pool({
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
});

// the pool will emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pgPool.on('error', (err, _) => {
  errorlog('Unexpected error on idle client', err);
  process.exit(-1);
});

pgPool.query = (agrs) => query(agrs);

export const getClient = async () => pgPool.connect().then((client) => client);

export const query = async (query) => {
  try {
    const client = await pgPool.connect();
    const result = await client.query(query);
    return result;
  } catch (error) {
    errorlog(error.stack);
  }
};

const getTables = async () => {
  const tables = await query(
    sql`select table_name from information_schema.tables where table_schema ='public'`,
  );
  return tables.rows;
};

const schemas = {};
export const loadSchema = async (tableName) => {
  if (Object.keys(schemas).length > 0) return schemas[tableName];
  const tables = await getTables();
  if (!tables || tables.length === 0) return;
  for (let { table_name } of tables) {
    let schema = await query(
      sql`select column_name , udt_name  from information_schema.columns where table_schema = 'public' and table_name = ${table_name}`,
    );
    if (schema) schema = schema.rows;
    let constraints = await query(sql`
            SELECT
                tc.constraint_type ,
                tc.constraint_name , 
                kcu.column_name , 
                ccu.table_name as foreign_table_name,
                ccu.column_name  as foreign_column_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE  tc.table_name=${table_name}`);
    if (constraints) constraints = constraints.rows;
    // const indexing =
    //   await query(sql`   SELECT pg_get_indexdef(indexrelid) from pg_index
    //       WHERE pg_get_indexdef(indexrelid) ~ 'USING (gin |gist )'`);
    schema.map(
      (each) =>
        (each.constrain = constraints.find(
          (c) => c.column_name === each.column_name,
        )),
    );
    schemas[table_name] = interpretSchema(table_name, schema);
  }
  return schemas[tableName];
};

function interpretSchema(table, schema) {
  const columnOptions = { columns: {}, links: {} };
  columnOptions.table = table;
  for (let { column_name: name, udt_name: dataType, constrain } of schema) {
    if (!constrain) {
      columnOptions.columns[name] = { role: 'simple' };
      continue;
    }
    if (dataType === 'JSON') {
      columnOptions.columns[name] = { role: 'default' };
      continue;
    }
    const { constraint_type, foreign_table_name, foreign_column_name } =
      constrain;
    if (constraint_type === 'PRIMARY KEY') {
      columnOptions.columns[name] = { role: 'primary' };
      continue;
    }

    if (constraint_type === 'FOREIGN KEY')
      columnOptions.links[foreign_table_name] = {
        target: foreign_table_name,
        prop: foreign_column_name,
      };
  }
  return columnOptions;
}

// const ENV_TEST = process.env.NODE_ENV === 'testing';
// let pool = null;
// let users = 0;
//
// export function acquirePool() {
//   if (!pool) pool = new pg.Pool();
//   users++;
//   return pool;
// }
//
// export function releasePool() {
//   users--;
//   if (!users && ENV_TEST) {
//     // If we are in tests, we should end the pool after all tests are finished
//     // for a clean exit.
//     pool.end();
//     pool = null;
//   }
// }
//
// process.on('SIGINT', () => {
//   pool.end();
//   process.exit();
// });
//
// process.on('SIGTERM', () => {
//   pool.end();
//   process.exit();
// });
