import { randomUUID } from 'node:crypto';
import { createClient } from '@clickhouse/client';
import { clickhouse } from '../src/clickhouse/index.js';
import Graffy from '../src/core/Graffy.js';

const connection = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'lego',
  password: process.env.CLICKHOUSE_PASSWORD || 'lego',
});

const database = 'graffy_smoke';
const table = 'workLog';

function formatDateTime64(value) {
  return value.toISOString().replace('T', ' ').replace('Z', '');
}

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
        time DateTime64(3),
        tenantId LowCardinality(String),
        code LowCardinality(String),
        recordIds Map(LowCardinality(String), String),
        data JSON
      )
      ENGINE = MergeTree
      PRIMARY KEY (tenantId, code, time)
      ORDER BY (tenantId, code, time, id)
    `,
    clickhouse_settings: {
      allow_experimental_json_type: 1,
    },
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

  const time1 = formatDateTime64(new Date());
  const time2 = formatDateTime64(new Date(Date.now() + 10));
  const firstId = randomUUID();
  const secondId = randomUUID();

  const firstWrite = await store.write(['workLog', firstId], {
    tenantId: 'tenant-1',
    code: 'screened_in',
    time: time1,
    recordIds: {
      gmailMessageId: 'gm-1',
      sfTaskId: 'task-1',
    },
    data: {
      stage: 'initial',
      kept: true,
    },
    $put: true,
  });

  const secondWrite = await store.write(['workLog', secondId], {
    tenantId: 'tenant-1',
    code: 'screened_in',
    time: time2,
    recordIds: {
      gmailMessageId: 'gm-1',
      sfTaskId: 'task-1',
    },
    data: {
      stage: 'written_to_clickhouse',
      kept: true,
      score: 98,
    },
    $put: true,
  });

  const byId = await store.read(`workLog.${firstId}`, {
    id: true,
    time: true,
    tenantId: true,
    code: true,
    recordIds: true,
    data: true,
  });

  const byRecordId = await store.read('workLog', {
    $key: {
      tenantId: 'tenant-1',
      code: 'screened_in',
      $order: ['time'],
      $all: true,
    },
    id: true,
    time: true,
    code: true,
    data: true,
  });

  console.log(
    JSON.stringify(
      {
        firstWrite,
        secondWrite,
        firstId,
        secondId,
        byId,
        byRecordId,
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
