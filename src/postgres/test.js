import { Graffy } from '@graffy/core';
import graffyPostgres from './index.js';
import $ from '@graffy/build';

const store = new Graffy();
store.use('posts', graffyPostgres('posts'));
store.use('users', graffyPostgres('users'));

test(async () => {
  const stream = store.read(
    $({ opt: { resume: { abc: true } } })(
      $.users(
        $.name,
        $.email,
        $.avatar,
        $.posts({ last: 3 })($.title, $.excerpt, $.time),
      ),
    ),
  );

  for await (const value of stream) {
    // eslint-disable-next-line no-console
    console.log(value);
  }
});
