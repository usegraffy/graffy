import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import sql from 'sql-template-tag';
import { Pool, Client } from 'pg';

const connOptions = {
  host: 'localhost',
  port: 15432,
  user: 'postgres',
  password: 'graffy',
  database: 'postgres',
};

let pool;
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
        '   Run yarn pg:cleanup to fix this.\n' +
        'Docker might have printed a detailed error message above.',
      );

      throw e;
    }

  while (!(await isPgReady(connOptions.port))) await sleep(200);
  // console.log('Postgres is up in', Date.now() - start, 'ms');

  pool = new Pool(connOptions);
}

export async function teardownPgServer() {
  await pool.end();
  pool = undefined;
  await execFile('docker', ['rm', '-f', 'graffypg']);
}

export async function populate() {
  // console.log('Creating tables');
  async function insert(type, number, builder = () => {}) {
    for (let i = 0; i < number; i++) {
      const name = builder(i) || {};
      const now = Date.now();
      // console.log('Inserting ', type, i);
      await pool.query(sql`INSERT INTO "users" (
        "id", "name", "updatedAt", "version"
      ) VALUES (
        ${type + i},
        ${name},
        ${now},
        ${now}
      );`);
    }
  }

  await pool.query(sql`
    DROP TABLE IF EXISTS "users";
  `);

  await pool.query(sql`
    CREATE TABLE "users" (
      "id" text PRIMARY KEY,
      "name" text,
      "updatedAt" int8 NOT NULL,
      "version" int8 NOT NULL
    );
  `);

  await insert('user', 5, (i) => `name_${i}`);
}

export function getPool() {
  if (!pool) throw Error('No pool; Did not setup PG or already torn down.');
  return pool;
}
