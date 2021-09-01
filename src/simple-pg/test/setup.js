import sql from 'sql-template-tag';
export async function populate(pool) {
  async function insert(type, number, builder = () => {}) {
    for (let i = 0; i < number; i++) {
      const name = builder(i) || {};
      const now = Date.now();
      // console.log('Inserting ', type, i);
      await pool.query(sql`INSERT INTO "users" (
        "id", "name", "version"
      ) VALUES (
        ${type + i},
        ${name},
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
      "version" int8 NOT NULL
    );
  `);

  await insert('user', 5, (i) => `name_${i}`);

  // await pool.end();
}
