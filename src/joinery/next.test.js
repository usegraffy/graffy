import { q as _ } from './build.js';
import { getSelects, runSelects } from './sql/index.js';

const query = _({ meta: { version: 0 } })(
  _.users(
    _['123'](_.name, _.email, _.posts(_({ last: 3 })(_.title, _.description))),
    _({ first: 10, after: [309] })(
      _.name,
      _.email,
      _.posts(_({ first: 7 })(_.title, _.description)),
    ),
  ),
  _.posts(
    _({ last: 3, order: ['updatetime', 'id'] })(
      _.title,
      _.description,
      _.author(_.name, _.email),
    ),
  ),
);

console.log(query);

const collections = {
  users: {
    name: 'user',
    links: [['posts', 'posts', 'author']],
  },
  posts: {
    name: 'post',
    links: [['author', 'users']],
  },
};

test('example', async () => {
  const selects = getSelects(query, collections);
  await runSelects(query, selects);
});

//
// {
//   filter,
//
//   order,
//   after,
//   since,
//   before,
//   until,
//
//   first,
//   last,
//
//   cursor,
// }
//
// //----
