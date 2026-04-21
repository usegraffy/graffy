import { execFile as execFileCb } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createClient } from '@clickhouse/client';

const connOptions = {
  url: process.env.CLICKHOUSE_URL || 'http://localhost:18123',
  username: process.env.CLICKHOUSE_USER || 'api',
  password: process.env.CLICKHOUSE_PASSWORD || 'api',
};

const testDatabase = 'graffy_test';
const useExternalServer = !!process.env.CLICKHOUSE_URL;

const composeFile = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'docker-compose.yml',
);

const execFile = promisify(execFileCb);
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

let client = null;

function makeClient() {
  return createClient(connOptions);
}

async function runCompose(args) {
  return execFile('docker', ['compose', '-f', composeFile, ...args]);
}

async function isClickhouseReady() {
  const probe = makeClient();
  try {
    const resultSet = await probe.query({
      query: 'SELECT 1',
      format: 'JSONEachRow',
    });
    await resultSet.json();
    return true;
  } catch (_) {
    return false;
  } finally {
    await probe.close();
  }
}

function encodeJsonString(value) {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

async function insertRows(table, rows) {
  if (!rows.length) return;
  await client.insert({
    table: `${testDatabase}.${table}`,
    values: rows,
    format: 'JSONEachRow',
  });
}

export async function setupClickhouseServer() {
  if (!useExternalServer) {
    try {
      await runCompose(['down', '-v', '--remove-orphans']);
    } catch (_) {
      // Ignore cleanup failures.
    }

    try {
      await runCompose(['up', '-d']);
    } catch (e) {
      console.error(
        'Could not start a test ClickHouse server using Docker Compose.\n' +
          'Docker might have printed a detailed error message above.',
      );
      throw e;
    }
  }

  for (let i = 0; i < 180; i += 1) {
    if (await isClickhouseReady()) break;
    await sleep(500);
  }

  if (!(await isClickhouseReady())) {
    throw Error('clickhouse.test_server_not_ready');
  }

  client = makeClient();
}

export async function teardownClickhouseServer() {
  if (client) {
    await client.close();
    client = null;
  }

  if (!useExternalServer) {
    await runCompose(['down', '-v', '--remove-orphans']);
  }
}

export async function resetTables() {
  if (!client) throw Error('No client; setupClickhouseServer was not called.');

  await client.command({
    query: `CREATE DATABASE IF NOT EXISTS ${testDatabase}`,
  });

  await client.command({ query: `DROP TABLE IF EXISTS ${testDatabase}.users` });
  await client.command({ query: `DROP TABLE IF EXISTS ${testDatabase}.posts` });
  await client.command({
    query: `DROP TABLE IF EXISTS ${testDatabase}.prospect`,
  });

  await client.command({
    query: `
      CREATE TABLE ${testDatabase}.users (
        id String,
        updatedAt Int64,
        name Nullable(String),
        email Nullable(String),
        settings Nullable(String)
      )
      ENGINE = ReplacingMergeTree(updatedAt)
      ORDER BY id
    `,
  });

  await client.command({
    query: `
      CREATE TABLE ${testDatabase}.posts (
        id String,
        updatedAt Int64,
        authorId Nullable(String),
        title Nullable(String),
        commenters Nullable(String),
        scores Nullable(String)
      )
      ENGINE = ReplacingMergeTree(updatedAt)
      ORDER BY id
    `,
  });

  await client.command({
    query: `
      CREATE TABLE ${testDatabase}.prospect (
        id String,
        updatedAt Int64,
        data Nullable(String),
        isDeleted UInt8
      )
      ENGINE = ReplacingMergeTree(updatedAt)
      ORDER BY id
    `,
  });
}

export async function seedUsers(rows) {
  await insertRows(
    'users',
    rows.map((row, ix) => ({
      id: row.id,
      updatedAt: row.updatedAt ?? Date.now() + ix,
      name: row.name ?? null,
      email: row.email ?? null,
      settings: encodeJsonString(row.settings),
    })),
  );
}

export async function seedPosts(rows) {
  await insertRows(
    'posts',
    rows.map((row, ix) => ({
      id: row.id,
      updatedAt: row.updatedAt ?? Date.now() + ix,
      authorId: row.authorId ?? null,
      title: row.title ?? null,
      commenters: encodeJsonString(row.commenters),
      scores: encodeJsonString(row.scores),
    })),
  );
}

export async function seedProspects(rows) {
  await insertRows(
    'prospect',
    rows.map((row, ix) => ({
      id: row.id,
      updatedAt: row.updatedAt ?? Date.now() + ix,
      data: encodeJsonString(row.data),
      isDeleted: row.isDeleted ? 1 : 0,
    })),
  );
}

export function getClient() {
  if (!client) throw Error('No client; setupClickhouseServer was not called.');
  return client;
}

export function getTestDatabase() {
  return testDatabase;
}
