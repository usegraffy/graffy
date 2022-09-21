import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import sql from 'sql-template-tag';
import pg from 'pg';

const { Pool, Client } = pg;

const connOptions = {
  host: 'localhost',
  port: 15432,
  user: 'postgres',
  password: 'graffy',
  database: 'postgres',
};

let pool = null;
const execFile = promisify(execFileCb);
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const isPgReady = async () => {
  try {
    const client = new Client(connOptions);
    await client.connect();
    await client.end();
    return true;
  } catch (_) {
    return false;
  }
};

export async function setupPgServer() {
  // const start = Date.now();
  // prettier-ignore
  try {
      await execFile('docker', [
        'run', '-d',
        '--name', 'graffypg',
        '-p', `${connOptions.port}:5432`,
        '-e', `POSTGRES_PASSWORD=${connOptions.password}`,
        'postgres:alpine',
      ]);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        'Could not start a test Postgres server using Docker.\n' +
        'Possible reasons:\n' +
        '1. You might not have Docker installed.\n' +
        '2. The last test run might not have exited properly.\n' +
        '   Run yarn pg:clean to fix this.\n' +
        'Docker might have printed a detailed error message above.',
      );

      throw e;
    }

  while (!(await isPgReady())) await sleep(200);
  // console.log('Postgres is up in', Date.now() - start, 'ms');

  pool = new Pool(connOptions);
}

export async function teardownPgServer() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  await execFile('docker', ['rm', '-f', 'graffypg']);
}

export async function resetTables() {
  if (!pool) throw Error('No pool; Did not setup PG or already torn down.');

  await pool.query(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
  await pool.query(sql`CREATE EXTENSION IF NOT EXISTS "cube"`);

  await pool.query(sql`
    DROP TABLE IF EXISTS "users";
  `);

  await pool.query(sql`
    CREATE UNLOGGED TABLE "users" (
      "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      "name" text,
      "settings" jsonb,
      "email" text UNIQUE,
      "version" int8 NOT NULL DEFAULT extract(epoch from current_timestamp) * 1000
    );
  `);

  await pool.query(sql`
    DROP TABLE IF EXISTS "prospect";
  `);

  await pool.query(sql`
    CREATE UNLOGGED TABLE "prospect" (
      "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      "version" int8 NOT NULL DEFAULT extract(epoch from current_timestamp) * 1000,
      "data" jsonb,
      "isDeleted" boolean
    );
  `);

  await pool.query(sql`
    DROP TABLE IF EXISTS "posts";
  `);

  await pool.query(sql`
    CREATE UNLOGGED TABLE "posts" (
      "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      "title" text,
      "authorId" text,
      "commenters" text[],
      "scores" cube,
      "version" int8 NOT NULL DEFAULT extract(epoch from current_timestamp) * 1000
    );
  `);
}

export function getPool() {
  if (!pool) throw Error('No pool; Did not setup PG or already torn down.');
  return pool;
}
