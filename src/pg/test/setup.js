import pg from 'pg';
import sql from 'sql-template-tag';

export async function populate() {
  // console.log('Creating tables');
  const pool = new pg.Pool({
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || '5432'),
  });

  async function insert(type, number, builder = () => {}) {
    for (let i = 0; i < number; i++) {
      const { tags = {}, data = {} } = builder(i) || {};
      const now = Date.now();
      // console.log('Inserting ', type, i);
      await pool.query(sql`INSERT INTO "user" (
        "id", "tags", "data", "version"
      ) VALUES (
        ${type + i},
        ${tags},
        ${data},
        ${now}
      );`);
    }
  }

  await pool.query(sql`
    DROP TABLE IF EXISTS "user";
  `);

  await pool.query(sql`
    CREATE TABLE "user" (
      "id" text PRIMARY KEY,
      "tags" jsonb NOT NULL DEFAULT '{}',
      "data" jsonb NOT NULL DEFAULT '{}',
      "version" int8 NOT NULL
    );
  `);

  await insert('tenant', 3, (_i) => ({
    data: {
      providers: {
        user: {
          type: 'db',
          table: 'user',
          columns: {
            id: { role: 'primary' },
            tags: { role: 'gin' },
            data: { role: 'default' },
            version: { role: 'version' },
          },
          links: { posts: { target: ['post'], back: ['author'] } },
        },
        post: {
          type: 'db',
          table: 'posts',
          columns: {
            id: { role: 'primary' },
            tags: { role: 'gin' },
            data: { role: 'default' },
            version: { role: 'version' },
          },
          links: { author: { target: ['user'] } },
        },
      },
    },
  }));
  await insert('user', 5, (i) => ({ data: { i } }));
  await insert('post', 5, (i) => ({
    data: { i, author: 'user' + (4 - i) },
    tags: { author: 'user' + (4 - i) },
  }));

  await pool.end();
}

// populate();
