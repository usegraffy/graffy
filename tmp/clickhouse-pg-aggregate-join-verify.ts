import assert from 'node:assert/strict';
import { type ClickHouseClient, createClient } from '@clickhouse/client';
import Graffy from '@graffy/core';
import { Pool } from 'pg';
import { clickhouse } from '../src/clickhouse/index.js';
import { pg } from '../src/pg/index.js';

type Primitive = string | number | boolean | null;
type JsonLike = Primitive | JsonLike[] | { [key: string]: JsonLike };

const PG_HOST = process.env.PG_HOST || '127.0.0.1';
const PG_PORT = Number(process.env.PG_PORT || '8432');
const PG_USER = process.env.PG_USER || 'postgres';
const PG_PASSWORD = process.env.PG_PASSWORD || 'postgres';
const PG_DATABASE = process.env.PG_DATABASE || 'lego';

const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL || 'http://localhost:8123';
const CLICKHOUSE_USER = process.env.CLICKHOUSE_USER || 'api';
const CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD || 'api';
const CLICKHOUSE_DB = process.env.CLICKHOUSE_DB || 'local_og';

async function queryPg<T>(
  pool: Pool,
  query: string,
  values: Primitive[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(query, values);
  return result.rows;
}

async function queryCh<T>(
  client: ClickHouseClient,
  query: string,
): Promise<T[]> {
  const result = await client.query({
    query,
    format: 'JSONEachRow',
  });
  return (await result.json()) as T[];
}

function asNumber(value: Primitive): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (typeof value === 'boolean') return Number(value);
  return 0;
}

function assertClose(name: string, left: number, right: number, eps = 1e-9) {
  const diff = Math.abs(left - right);
  assert.ok(
    diff <= eps,
    `${name} mismatch: left=${left}, right=${right}, diff=${diff}`,
  );
}

function normalizeGraph<T extends JsonLike>(value: T): JsonLike {
  return JSON.parse(JSON.stringify(value));
}

async function verifyAggregates(pool: Pool, ch: ClickHouseClient) {
  type AggRow = {
    count: string | number;
    sum: string | number;
    avg: string | number;
    max: string | number;
    min: string | number;
  };

  const [pgAgg] = await queryPg<AggRow>(
    pool,
    `SELECT
      count(*)::bigint AS count,
      sum(COALESCE(("data"->>'Amount')::numeric, 0))::numeric AS sum,
      avg(COALESCE(("data"->>'Amount')::numeric, 0))::numeric AS avg,
      max(COALESCE(("data"->>'Amount')::numeric, 0))::numeric AS max,
      min(COALESCE(("data"->>'Amount')::numeric, 0))::numeric AS min
     FROM "prospect"
     WHERE "isDeleted" = false`,
  );

  const [chAgg] = await queryCh<AggRow>(
    ch,
    `SELECT
      count() AS count,
      sum(toFloat64OrZero(JSONExtractString(ifNull(\`data\`, '{}'), 'Amount'))) AS sum,
      avg(toFloat64OrZero(JSONExtractString(ifNull(\`data\`, '{}'), 'Amount'))) AS avg,
      max(toFloat64OrZero(JSONExtractString(ifNull(\`data\`, '{}'), 'Amount'))) AS max,
      min(toFloat64OrZero(JSONExtractString(ifNull(\`data\`, '{}'), 'Amount'))) AS min
     FROM ${CLICKHOUSE_DB}.prospect FINAL
     WHERE _sign = 1 AND isDeleted = 0`,
  );

  assert.equal(asNumber(pgAgg.count), asNumber(chAgg.count), 'aggregate.count');
  assertClose('aggregate.sum', asNumber(pgAgg.sum), asNumber(chAgg.sum));
  assertClose('aggregate.avg', asNumber(pgAgg.avg), asNumber(chAgg.avg));
  assertClose('aggregate.max', asNumber(pgAgg.max), asNumber(chAgg.max));
  assertClose('aggregate.min', asNumber(pgAgg.min), asNumber(chAgg.min));

  type GroupRow = {
    group_key: boolean | number;
    count: string | number;
    sum: string | number;
    card: string | number;
  };

  const pgGrouped = await queryPg<GroupRow>(
    pool,
    `SELECT
      "isDeleted" AS group_key,
      count(*)::bigint AS count,
      sum(COALESCE(("data"->>'Amount')::numeric, 0))::numeric AS sum,
      count(distinct("id"))::bigint AS card
     FROM "prospect"
     GROUP BY "isDeleted"
     ORDER BY "isDeleted"`,
  );

  const chGrouped = await queryCh<GroupRow>(
    ch,
    `SELECT
      isDeleted AS group_key,
      count() AS count,
      sum(toFloat64OrZero(JSONExtractString(ifNull(\`data\`, '{}'), 'Amount'))) AS sum,
      uniqExact(\`id\`) AS card
     FROM ${CLICKHOUSE_DB}.prospect FINAL
     WHERE _sign = 1
     GROUP BY isDeleted
     ORDER BY isDeleted`,
  );

  assert.equal(pgGrouped.length, chGrouped.length, 'grouped.length');
  for (let i = 0; i < pgGrouped.length; i += 1) {
    const pgRow = pgGrouped[i];
    const chRow = chGrouped[i];
    assert.equal(
      asNumber(pgRow.group_key as Primitive),
      asNumber(chRow.group_key as Primitive),
      `grouped[${i}].group_key`,
    );
    assert.equal(
      asNumber(pgRow.count),
      asNumber(chRow.count),
      `grouped[${i}].count`,
    );
    assertClose(`grouped[${i}].sum`, asNumber(pgRow.sum), asNumber(chRow.sum));
    assert.equal(
      asNumber(pgRow.card),
      asNumber(chRow.card),
      `grouped[${i}].card`,
    );
  }

  const chStore = new Graffy();
  chStore.use(
    'prospect',
    clickhouse({
      database: CLICKHOUSE_DB,
      table: 'prospect',
      idCol: 'id',
      verCol: 'updatedAt',
      connection: ch,
    }),
  );

  const chAggRead = await chStore.read('prospect', {
    $key: { isDeleted: false, $group: true },
    $count: true,
    $sum: { 'data.Amount': true },
    $avg: { 'data.Amount': true },
    $max: { 'data.Amount': true },
    $min: { 'data.Amount': true },
  });

  assert.equal(chAggRead.length, 1, 'ch aggregate read length');
  assert.equal(asNumber(chAggRead[0].$count), asNumber(chAgg.count));
  assertClose(
    'ch aggregate read sum',
    asNumber(chAggRead[0].$sum['data.Amount']),
    asNumber(chAgg.sum),
  );
  assertClose(
    'ch aggregate read avg',
    asNumber(chAggRead[0].$avg['data.Amount']),
    asNumber(chAgg.avg),
  );
  assertClose(
    'ch aggregate read max',
    asNumber(chAggRead[0].$max['data.Amount']),
    asNumber(chAgg.max),
  );
  assertClose(
    'ch aggregate read min',
    asNumber(chAggRead[0].$min['data.Amount']),
    asNumber(chAgg.min),
  );

  const chGroupedRead = await chStore.read('prospect', {
    $key: { $group: ['isDeleted'], $all: true },
    $count: true,
    $sum: { 'data.Amount': true },
    $card: { id: true },
  });

  type GroupedReadRow = {
    $key: { $cursor: Primitive[] };
    $count: Primitive;
    $sum: Record<string, Primitive>;
    $card: Record<string, Primitive>;
  };

  const groupedReadByCursor = new Map<number, GroupedReadRow>();
  for (const row of chGroupedRead) {
    groupedReadByCursor.set(asNumber(row.$key.$cursor[0]), row);
  }

  for (const row of chGrouped) {
    const cursor = asNumber(row.group_key as Primitive);
    const readRow = groupedReadByCursor.get(cursor);
    assert.ok(readRow, `missing ch grouped read row for cursor ${cursor}`);
    assert.equal(asNumber(readRow.$count), asNumber(row.count));
    assertClose(
      `ch grouped read sum ${cursor}`,
      asNumber(readRow.$sum['data.Amount']),
      asNumber(row.sum),
    );
    assert.equal(asNumber(readRow.$card.id), asNumber(row.card));
  }

  console.log('aggregate verification passed');
  console.log({
    filtered: {
      count: asNumber(pgAgg.count),
      sum: asNumber(pgAgg.sum),
      avg: asNumber(pgAgg.avg),
      max: asNumber(pgAgg.max),
      min: asNumber(pgAgg.min),
    },
    groupedCount: pgGrouped.length,
  });
}

async function verifyJoinReads(pool: Pool, ch: ClickHouseClient) {
  type SyncJobRow = {
    id: string;
    integrationId: string;
    objectType: string | null;
  };

  const [sampleSyncJob] = await queryPg<SyncJobRow>(
    pool,
    `SELECT
      "id",
      "integrationId",
      "objectType"
     FROM "sfSyncJob"
     WHERE "integrationId" IS NOT NULL
     LIMIT 1`,
  );

  if (!sampleSyncJob) {
    console.log(
      'join verification skipped: no sfSyncJob row with integrationId',
    );
    return;
  }

  const regexSeed = (sampleSyncJob.objectType || '.*')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .slice(0, 6);
  const regex = regexSeed ? regexSeed : '.*';

  const pgStore = new Graffy();
  pgStore.use(
    'sfIntegration',
    pg({
      table: 'sfIntegration',
      idCol: 'id',
      verCol: 'updatedAt',
      connection: pool,
      joins: {
        syncJob: {
          table: 'sfSyncJob',
          idCol: 'id',
          verCol: 'updatedAt',
          refCol: 'integrationId',
        },
      },
    }),
  );

  const chStore = new Graffy();
  chStore.use(
    'sfIntegration',
    clickhouse({
      database: CLICKHOUSE_DB,
      table: 'sfIntegration',
      idCol: 'id',
      verCol: 'updatedAt',
      connection: ch,
      joins: {
        syncJob: {
          database: CLICKHOUSE_DB,
          table: 'sfSyncJob',
          idCol: 'id',
          verCol: 'updatedAt',
          refCol: 'integrationId',
        },
      },
    }),
  );

  const queries: Record<string, Record<string, JsonLike>> = {
    equals: {
      $key: {
        syncJob: { id: sampleSyncJob.id },
      },
      id: true,
      userId: true,
    },
    regex: {
      $key: {
        $order: ['id'],
        $all: true,
        syncJob: { objectType: { $ire: regex } },
      },
      id: true,
      userId: true,
    },
    combinedNarrowing: {
      $key: {
        id: sampleSyncJob.integrationId,
        syncJob: { objectType: { $ire: regex } },
      },
      id: true,
      userId: true,
    },
    negativeRange: {
      $key: {
        $order: ['id'],
        $all: true,
        id: sampleSyncJob.integrationId,
        syncJob: { objectType: '__missing_object_type__' },
      },
      id: true,
      userId: true,
    },
  };

  for (const [name, query] of Object.entries(queries)) {
    const [pgRes, chRes] = await Promise.all([
      pgStore.read('sfIntegration', query),
      chStore.read('sfIntegration', query),
    ]);
    const normPg = normalizeGraph(pgRes);
    const normCh = normalizeGraph(chRes);
    assert.deepEqual(normCh, normPg, `join query mismatch: ${name}`);
    console.log(`join query passed: ${name}`);
  }
}

async function main() {
  const pool = new Pool({
    host: PG_HOST,
    port: PG_PORT,
    user: PG_USER,
    password: PG_PASSWORD,
    database: PG_DATABASE,
  });

  const ch = createClient({
    url: CLICKHOUSE_URL,
    username: CLICKHOUSE_USER,
    password: CLICKHOUSE_PASSWORD,
  });

  try {
    await verifyAggregates(pool, ch);
    await verifyJoinReads(pool, ch);
  } finally {
    await Promise.all([pool.end(), ch.close()]);
  }

  console.log('all verification checks passed');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
