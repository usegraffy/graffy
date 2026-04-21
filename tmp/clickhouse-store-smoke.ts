import { createClient } from '@clickhouse/client';
import Graffy from '../src/core/Graffy.js';
import { clickhouse } from '../src/clickhouse/index.js';

const connection = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'lego',
  password: process.env.CLICKHOUSE_PASSWORD || 'lego',
});

const database = 'graffy_smoke';
const table = 'workLog';

async function main() {
  await connection.command({
    query: `CREATE DATABASE IF NOT EXISTS ${database}`,
  });

  await connection.command({
    query: `DROP TABLE IF EXISTS ${database}.${table}`,
  });

  await connection.command({
    query: `
      CREATE TABLE ${database}.${table} (
        id String,
        time Int64,
        tenantId String,
        code String,
        recordIds Nullable(String),
        data Nullable(String),
        _sign Int8 DEFAULT 1
      )
      ENGINE = ReplacingMergeTree(time)
      ORDER BY id
    `,
  });

  const store = new Graffy();
  store.use(
    'workLog',
    clickhouse({
      database,
      table,
      idCol: 'id',
      verCol: 'time',
      connection,
    }),
  );

  await store.write(['workLog', 'wl-1'], {
    tenantId: 'tenant-1',
    code: 'materialized',
    recordIds: {
      gmailMessageId: 'gmail-1',
      sfTaskId: 'task-1',
    },
    data: {
      stage: 'initial',
      kept: true,
    },
    $put: true,
  });

  await store.write(['workLog', 'wl-1'], {
    data: {
      stage: 'updated',
      details: {
        source: 'tmp/clickhouse-store-smoke.ts',
      },
    },
  });

  const byId = await store.read('workLog.wl-1', {
    tenantId: true,
    code: true,
    recordIds: true,
    data: true,
  });

  const byTenant = await store.read('workLog', {
    $key: {
      tenantId: 'tenant-1',
      $order: ['id'],
      $all: true,
    },
    id: true,
    code: true,
    data: true,
  });

  console.log(
    JSON.stringify(
      {
        byId,
        byTenant,
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} finally {
  await connection.close();
}
