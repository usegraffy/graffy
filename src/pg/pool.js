import { Pool } from 'pg';
import sql from 'sql-template-tag';
import debug from 'debug';
const log = (...text) => debug(`graffy:pg:${text.shift()}`)(text);

const pgPool = {};
pgPool.connect = (config) => {
  const pool = new Pool(config);
  pgPool.setPool(pool);
};

pgPool.setPool = (pool) => {
  // the pool will emit an error on behalf of any idle clients
  // it contains if a backend error or network partition happens
  pool.on('error', (err, _) => {
    log('error', 'Unexpected error on idle client', err);
    process.exit(-1);
  });
  pgPool.pool = pool;
};

// customised client
pgPool.setClient = (client) => {
  pgPool.client = client;
};

pgPool.getClient = async () =>
  pgPool.client ? pgPool.client() : pgPool.pool.connect();

pgPool.query = async (query) => {
  if (!pgPool.pool && !pgPool.client)
    throw Error('Connect with postgres db is required!');
  const client = await pgPool.getClient();
  try {
    const res = await client.query(query);
    return res;
  } catch (error) {
    log('error', error);
  }
};

const schemas = {};
pgPool.loadSchema = async (tableName) => {
  if (schemas[tableName]) return schemas[tableName];
  let schema = await pgPool.query(
    sql`select column_name , udt_name  from information_schema.columns where table_schema = 'public' and table_name = ${tableName}`,
  );
  if (schema) schema = schema.rows;
  let constraints = await pgPool.query(sql`
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
            WHERE  tc.table_name=${tableName}`);
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
  schemas[tableName] = interpretSchema(tableName, schema);
  return schemas[tableName];
};

pgPool.select = async (sqlQuery) => {
  log('select', sqlQuery.text);
  log('select', sqlQuery.values);
  sqlQuery.rowMode = 'array';
  const result = (await pgPool.query(sqlQuery)).rows.flat();
  // Each row is an array, as there is only one column returned.
  log('select', 'ReadSQL', result);
  return result;
};

pgPool.select = async (sqlQuery) => {
  log('select', sqlQuery.text);
  log('select', sqlQuery.values);
  sqlQuery.rowMode = 'array';
  const result = (await pgPool.query(sqlQuery)).rows.flat();
  // Each row is an array, as there is only one column returned.
  log('select', 'ReadSQL', result);
  return result;
};

pgPool.insert = async (query) => {
  log('insert', query.text);
  log('insert', query.values);
  query.rowMode = 'array';
  let res = await pgPool.query(query);
  res = res || { rowCount: 0 };
  log('insert', 'Rows written', res.rowCount);
  return res.rowCount;
};

function interpretSchema(table, schema) {
  const columnOptions = { columns: {}, links: {} };
  columnOptions.table = table;
  for (let { column_name: name, constrain } of schema) {
    if (constrain) {
      const { constraint_type, foreign_table_name, foreign_column_name } =
        constrain;

      columnOptions.columns[name] =
        constraint_type.toUpperCase() === 'PRIMARY KEY'
          ? (columnOptions.columns[name] = { role: 'primary' })
          : { role: 'simple' };
      if (constraint_type.toUpperCase() === 'FOREIGN KEY')
        columnOptions.links[foreign_table_name] = {
          target: foreign_table_name,
          prop: foreign_column_name,
        };
      continue;
    }

    columnOptions.columns[name] = { role: 'simple' };
  }
  return columnOptions;
}

export default pgPool;
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
