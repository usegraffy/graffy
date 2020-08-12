import pg from 'pg';
import sql from 'sqlate';

const pool = new pg.Pool();

async function insert(type, number, builder = () => {}) {
  for (let i = 0; i < number; i++) {
    const { links = {}, tags = {}, data = {} } = builder(i) || {};
    const now = Date.now();
    console.log('Inserting ', type, i);
    await pool.query(sql`INSERT INTO object(
      id, type, name, links, tags, data, createTime, updateTime
    ) VALUES (
      ${type + i},
      ${type},
      ${type + ' ' + i},
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
    DROP TABLE IF EXISTS object;
  `);

  await pool.query(sql`
    CREATE TABLE object(
      id text PRIMARY KEY,
      type text NOT NULL,
      name text NOT NULL,
      links jsonb NOT NULL DEFAULT '{}',
      tags jsonb NOT NULL DEFAULT '{}',
      data jsonb NOT NULL DEFAULT '{}',
      createTime int8 NOT NULL,
      updateTime int8 NOT NULL
    );
  `);

  await insert('user', 5);
  await insert('post', 5, (i) => ({ links: { author: 'user' + (4 - i) } }));

  pool.end();
}

populate();
