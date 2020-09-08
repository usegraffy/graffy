import pg from 'pg';
import sql from 'sqlate';

const pool = new pg.Pool();

async function insert(type, number, builder = () => {}) {
  for (let i = 0; i < number; i++) {
    const { links = {}, tags = {}, data = {} } = builder(i) || {};
    const now = Date.now();
    console.log('Inserting ', type, i);
    await pool.query(sql`INSERT INTO "object"(
      "id", "type", "links", "tags", "data", "createTime", "updateTime"
    ) VALUES (
      ${[type + i]},
      ${type},
      ${links},
      ${tags},
      ${data},
      ${now},
      ${now}
    );`);
  }
}

async function populate() {
  console.log('Creating tables');

  await pool.query(sql`
    DROP TABLE IF EXISTS "object";
  `);

  await pool.query(sql`
    CREATE TABLE "object" (
      "id" text[] PRIMARY KEY,
      "type" text NOT NULL,
      "links" jsonb NOT NULL DEFAULT '{}',
      "tags" jsonb NOT NULL DEFAULT '{}',
      "data" jsonb NOT NULL DEFAULT '{}',
      "createTime" int8 NOT NULL,
      "updateTime" int8 NOT NULL
    );
  `);

  await insert('tenant', 3, (i) => ({
    data: {
      providers: {
        _val_: {
          user: {
            type: 'db',
            collection: 'user',
            indexes: [['email'], ['role']],
            links: [{ prop: ['posts'], target: ['post'], back: ['author'] }],
          },
          post: {
            type: 'db',
            collection: 'post',
            indexes: [['slug'], ['publishedAt']],
            links: [{ prop: ['author'], target: ['user'] }],
          },
        },
      },
    },
  }));
  await insert('user', 5, (i) => ({ data: { i } }));
  await insert('post', 5, (i) => ({
    data: { i },
    links: { author: 'user' + (4 - i) },
  }));

  pool.end();
}

populate();
