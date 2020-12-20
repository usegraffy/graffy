import { insert, update } from './upsert.js';
import makeOptions from '../options.js';

import sql from 'sql-template-tag';
import expectSql from './expectSql.js';

const options = makeOptions(['post$'], {
  table: 'post',
  columns: {
    id: { role: 'primary' },
    type: { role: 'simple' },
    data: { role: 'default' },
    gin: { role: 'gin', props: ['email'] },
  },
});

test('insert', async () => {
  expectSql(
    insert(
      { id: 'post22', type: 'post', name: 'hello', email: 'world' },
      options,
    ),
    sql`INSERT INTO "post" ("id", "type", "gin", "data")
      VALUES (${'post22'}, ${'post'},
        ${{ email: 'world' }},
        ${{ name: 'hello', email: 'world' }})
    `,
  );
});
