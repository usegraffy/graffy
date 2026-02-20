import { type ClickHouseClient, createClient } from '@clickhouse/client';
import Graffy from '@graffy/core';
import { clickhouse } from '../src/clickhouse/index.js';

const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL || 'http://localhost:8123';
const CLICKHOUSE_USER = process.env.CLICKHOUSE_USER || 'api';
const CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD || 'api';
const CLICKHOUSE_DB = process.env.CLICKHOUSE_DB || 'local_og';

async function getRows<T>(
  client: ClickHouseClient,
  query: string,
): Promise<T[]> {
  const rs = await client.query({
    query,
    format: 'JSONEachRow',
  });
  return (await rs.json()) as T[];
}

async function main() {
  const client = createClient({
    url: CLICKHOUSE_URL,
    username: CLICKHOUSE_USER,
    password: CLICKHOUSE_PASSWORD,
  });

  const [sampleMessage] = await getRows<{
    tenantId: string;
    id: string;
    participants: string;
  }>(
    client,
    `SELECT tenantId, id, participants
     FROM ${CLICKHOUSE_DB}.gmailMessage FINAL
     WHERE _sign = 1 AND participants IS NOT NULL
     ORDER BY createdAt DESC
     LIMIT 1`,
  );

  if (!sampleMessage) {
    throw new Error('No gmailMessage rows found for smoke test');
  }

  const participants = JSON.parse(sampleMessage.participants || '[]');
  const searchAddress = participants?.[0]?.address;
  if (!searchAddress) {
    throw new Error('Could not find participant address in sample row');
  }

  const [sampleEvent] = await getRows<{ eventId: string }>(
    client,
    `SELECT eventId
     FROM ${CLICKHOUSE_DB}.gcalEvent FINAL
     WHERE _sign = 1 AND tenantId = '${sampleMessage.tenantId}'
     AND eventId IS NOT NULL
     ORDER BY createdAt DESC
     LIMIT 1`,
  );

  const store = new Graffy();
  [
    'gmailMessage',
    'gcalEvent',
    'activity',
    'sfWrite',
    'sfIntegration',
    'googleIntegration',
    'msIntegration',
    'googleConfig',
    'sfTask',
    'sfEvent',
    'sfAccount',
    'sfOpportunity',
    'sfUser',
    'company',
    'prospect',
  ].forEach((table) => {
    store.use(
      table,
      clickhouse({
        database: CLICKHOUSE_DB,
        table,
        connection: client,
        idCol: 'id',
        verCol: 'updatedAt',
      }),
    );
  });

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const messageResults = await store.read('gmailMessage', {
    $key: {
      $order: ['id'],
      $all: true,
      tenantId: sampleMessage.tenantId,
      isDeleted: false,
      participants: {
        $cts: [{ address: searchAddress }],
      },
      createdAt: {
        $gte: thirtyDaysAgo,
        $lte: now,
      },
    },
    id: true,
    integrationId: true,
    data: {
      internalDate: true,
      subject: true,
    },
    createdAt: true,
    participants: true,
    messageId: true,
  });

  console.log(
    '[tracker-like] gmailMessage results:',
    messageResults.length,
    'sample id:',
    messageResults[0]?.id,
  );

  if (sampleEvent?.eventId) {
    const activityResults = await store.read('activity', {
      $key: {
        $order: ['createdAt', 'id'],
        $first: 1,
        tenantId: sampleMessage.tenantId,
        'sources.eventId': sampleEvent.eventId,
        isDeleted: false,
      },
      id: true,
      subject: true,
      sources: true,
      debug: true,
    });
    console.log(
      '[tracker-like] activity lookup by sources.eventId:',
      activityResults.length,
      'sample id:',
      activityResults[0]?.id,
    );
  } else {
    console.log('[tracker-like] skipped activity lookup, no sample gcalEvent');
  }

  const sfWriteResults = await store.read('sfWrite', {
    $key: {
      $order: ['!createdAt', 'id'],
      $first: 1,
      tenantId: sampleMessage.tenantId,
      'sources.messageId': sampleMessage.id,
    },
    id: true,
    lastError: true,
    sources: true,
  });

  console.log(
    '[tracker-like] sfWrite lookup by dotted sources.*:',
    sfWriteResults.length,
    'sample id:',
    sfWriteResults[0]?.id,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
